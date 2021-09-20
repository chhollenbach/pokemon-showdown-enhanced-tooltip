// Inject Enhancement Suite as script so that it can access DOM
var s = document.createElement("script");
s.src = chrome.runtime.getURL("/dest/enhancement_suite.bundle.js");
document.body.appendChild(s)