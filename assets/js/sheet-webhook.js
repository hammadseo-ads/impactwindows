var SHEET_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyBrG7JbdUMc2sAY75928tIfD2_VGbvuJmgK_Sgd5Ss8XCBW_qJKH8zb3leLLCgwiMZ/exec';

/* Sheet me row har haal me jani chahiye - magar SIRF EK dafa.

   1) sendBeacon pehle: browser is request ko khud queue karta hai aur page
      badal jane ke baad bhi poora bhejta hai. Is liye "gayi ya nahi" ka
      sawal hi nahi uthta aur dobara bhejne ki zarurat nahi padti.
   2) beacon na ho (purana browser, ya queue bhari) to fetch + keepalive.
   3) dono na chalen to payload localStorage me pada rehta hai aur agli page
      load par jata hai - usi sid ke saath.

   Har submit ka apna sid (submission id) jata hai. Agar wohi sid dobara
   pohanch jaye to receiver ko nayi row nahi banani - duplicate ka pakka
   ilaj yehi hai, kyunke retry jaan kar rakhi gayi hai (lead khona duplicate
   se buri baat hai). */

var SHEET_PENDING_KEY = 'usahi_sheet_pending2';
/* Purani key ki copy kabhi kabhi pehle hi ja chuki hoti thi - use bhejna
   nahi, sirf mita dena hai, warna ek aur duplicate banega. */
try{ localStorage.removeItem('usahi_sheet_pending'); }catch(e){}
var SHEET_RETRY_AFTER_MS = 5 * 60 * 1000;   /* itni purani pending hi dobara bhejni hai,
                                               warna usi submit ki dobara chali jati */

function sheetSid(){
  try{ if(window.crypto && crypto.randomUUID) return crypto.randomUUID(); }catch(e){}
  return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function sheetBeacon(data){
  try{
    return !!(navigator.sendBeacon &&
      navigator.sendBeacon(SHEET_WEBHOOK_URL, new Blob([data], {type:'application/x-www-form-urlencoded'})));
  }catch(e){ return false; }
}

function sheetFetch(data){
  return fetch(SHEET_WEBHOOK_URL, {
    method:'POST', mode:'no-cors', keepalive:true,
    headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:data
  });
}

function sheetPost(data){
  /* beacon pehle - page badal jane par bhi mukammal hoti hai */
  if(sheetBeacon(data)) return Promise.resolve('beacon');
  if(window.fetch){
    try{ return sheetFetch(data); }catch(e){}
  }
  return Promise.reject(new Error('koi tareeqa na chala'));
}

function sheetPendingSet(data){
  try{ localStorage.setItem(SHEET_PENDING_KEY, JSON.stringify({t:Date.now(), d:data})); }catch(e){}
}
function sheetPendingClear(){
  try{ localStorage.removeItem(SHEET_PENDING_KEY); }catch(e){}
}

function sendToSheet(form){
  if(!SHEET_WEBHOOK_URL || SHEET_WEBHOOK_URL.indexOf('PASTE_')===0) return Promise.resolve();
  try{
    function get(name){ var el=form.querySelector('[name="'+name+'"]'); return el?el.value:''; }
    function ls(key){ try{ return localStorage.getItem(key)||''; }catch(e){ return ''; } }
    var landing=''; try{ landing=sessionStorage.getItem('usahi_landing')||''; }catch(e){}
    var payload = {
      sid: sheetSid(),                  /* ek submit = ek sid, retry par bhi wohi */
      page: location.pathname,
      form_type: get('00NQQ00000IJMTt'),
      full_name: (form.querySelector('.sf-fullname')||{}).value || '',
      phone: get('phone'),
      email: get('email'),
      zip: get('zip'),
      interested_in: get('00N5a00000DXmGJ'),
      message: get('00N5a00000DWvKF'),
      gclid: ls('usahi_gclid'),
      utm_source: ls('usahi_utm_source'),
      utm_medium: ls('usahi_utm_medium'),
      utm_campaign: ls('usahi_utm_campaign'),
      utm_term: ls('usahi_utm_term'),
      utm_content: ls('usahi_utm_content'),
      utm_matchtype: ls('usahi_utm_matchtype'),
      utm_device: ls('usahi_utm_device'),
      campaign_id: ls('usahi_campaignid'),
      adgroup_id: ls('usahi_adgroupid'),
      keyword: ls('usahi_keyword'),
      matchtype: ls('usahi_matchtype'),
      device: ls('usahi_device'),
      landing_url: landing,
      page_url: location.href
    };
    var data = new URLSearchParams(payload).toString();

    /* 1) beacon. Pehle fetch chalta tha, aur jab banda /thank-you/ par chala
          jata tha to wohi fetch "fail" ho kar DOBARA beacon bhej deta tha -
          halanke pehli request Google tak pohanch chuki hoti thi. Isi se
          sheet me ek hi submit ki do rows banti thin, ek doosri se ek do
          second peechay. Beacon ko browser khud queue karta hai, is liye
          ab resend ki zarurat hi nahi. */
    if(sheetBeacon(data)){
      sheetPendingClear();
      return Promise.resolve('beacon');
    }

    /* 2) beacon na chala to fetch. Fail hone par DOBARA NAHI bhejte - payload
          pending reh jata hai aur agli load par usi sid ke saath jata hai. */
    if(window.fetch){
      sheetPendingSet(data);
      try{
        return sheetFetch(data)
          .then(function(r){ sheetPendingClear(); return r; })
          .catch(function(){ return 'pending'; });
      }catch(e){}
    }

    /* 3) kuch na nikal saka - agli load par jayega */
    sheetPendingSet(data);
    return Promise.resolve('pending');
  }catch(e){ return Promise.resolve(); }
}

/* Page khulte hi: pichli dafa ki row na gayi ho to ab bhejo. */
(function(){
  try{
    var raw = localStorage.getItem(SHEET_PENDING_KEY);
    if(!raw) return;
    var p = JSON.parse(raw);
    if(!p || !p.d){ sheetPendingClear(); return; }
    if(Date.now() - (p.t || 0) < SHEET_RETRY_AFTER_MS) return;
    sheetPendingClear();                /* ek hi dafa koshish, warna har load par jata rahega */
    sheetPost(p.d + '&retry=1').catch(function(){});
  }catch(e){}
})();
