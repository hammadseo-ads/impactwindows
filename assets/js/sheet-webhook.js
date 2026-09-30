var SHEET_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyBrG7JbdUMc2sAY75928tIfD2_VGbvuJmgK_Sgd5Ss8XCBW_qJKH8zb3leLLCgwiMZ/exec';

/* Sheet me row har haal me jani chahiye.
   1) fetch + keepalive: page badalne ke baad bhi chalta rehta hai aur poora
      hone par jawab deta hai, is liye pata chal jata hai ke chala gaya.
   2) na chale to sendBeacon.
   3) phir bhi na gaya to payload localStorage me pada rehta hai aur agli
      page load par dobara jata hai (retry=1 ke saath). */

var SHEET_PENDING_KEY = 'usahi_sheet_pending2';
/* Purani key ki copy kabhi kabhi pehle hi ja chuki hoti thi - use bhejna
   nahi, sirf mita dena hai, warna ek aur duplicate banega. */
try{ localStorage.removeItem('usahi_sheet_pending'); }catch(e){}
var SHEET_RETRY_AFTER_MS = 5 * 60 * 1000;   /* itni purani pending hi dobara bhejni hai,
                                               warna usi submit ki dobara chali jati */

function sheetBeacon(data){
  try{
    return !!(navigator.sendBeacon &&
      navigator.sendBeacon(SHEET_WEBHOOK_URL, new Blob([data], {type:'application/x-www-form-urlencoded'})));
  }catch(e){ return false; }
}

function sheetPost(data){
  if(window.fetch){
    try{
      return fetch(SHEET_WEBHOOK_URL, {
        method:'POST', mode:'no-cors', keepalive:true,
        headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:data
      });
    }catch(e){}
  }
  if(sheetBeacon(data)) return Promise.resolve('beacon');
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

    /* Pending copy SIRF us waqt bachti hai jab request browser se nikal hi
       na sake (jaise net band ho). Jaise hi request nikal jati hai, copy
       mita di jati hai - warna jawab aane se pehle page badal jata tha,
       copy pari reh jati thi, aur banda dobara site par aata to wohi lead
       doosri dafa chali jati thi (sheet me duplicate row). */

    sheetPendingSet(data);

    if(window.fetch){
      try{
        var p = fetch(SHEET_WEBHOOK_URL, {
          method:'POST', mode:'no-cors', keepalive:true,
          headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:data
        });
        sheetPendingClear();            /* request nikal gayi */
        return p.catch(function(){
          /* network par mar gayi - beacon se ek aur koshish */
          if(!sheetBeacon(data)) { sheetPendingSet(data); }
          return 'retried';
        });
      }catch(e){}
    }

    if(sheetBeacon(data)){ sheetPendingClear(); return Promise.resolve('beacon'); }
    return Promise.resolve('pending');   /* kuch na nikal saka - agli load par jayega */
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
    sheetPost(p.d + '&retry=1').then(function(){ sheetPendingClear(); }).catch(function(){});
  }catch(e){}
})();
