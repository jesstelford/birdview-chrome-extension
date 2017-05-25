var hasLoaded = false;
var event;
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action == 'icon-clicked') {
    if (hasLoaded) {
      event = new Event('birdview:toggle');
      document.dispatchEvent(event);
    } else {
      hasLoaded = true;
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = chrome.extension.getURL('src/inject/birdview.css');
      document.head.appendChild(link);

      var script = document.createElement('script');
      script.src = chrome.extension.getURL('src/inject/birdview.js');
      script.onload = function() {
        event = new Event('birdview:init');
        document.dispatchEvent(event);
        event = new Event('birdview:toggle');
        document.dispatchEvent(event);
      }
      document.head.appendChild(script);
    }
  }
});
