var SHEET_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyBrG7JbdUMc2sAY75928tIfD2_VGbvuJmgK_Sgd5Ss8XCBW_qJKH8zb3leLLCgwiMZ/exec';
function sendToSheet(form){
  if(!SHEET_WEBHOOK_URL || SHEET_WEBHOOK_URL.indexOf('PASTE_')===0) return;
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
      campaign_id: ls('usahi_campaignid'),
      adgroup_id: ls('usahi_adgroupid'),
      keyword: ls('usahi_keyword'),
      matchtype: ls('usahi_matchtype'),
      device: ls('usahi_device'),
      network: ls('usahi_network'),
      landing_url: landing,
      page_url: location.href
    };
    var data = new URLSearchParams(payload).toString();
    if(navigator.sendBeacon){
      navigator.sendBeacon(SHEET_WEBHOOK_URL, new Blob([data], {type:'application/x-www-form-urlencoded'}));
    }else{
      fetch(SHEET_WEBHOOK_URL, {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:data, keepalive:true}).catch(function(){});
    }
  }catch(e){}
}
