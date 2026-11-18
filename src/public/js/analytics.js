// Vercel Web Analytics - Vanilla JavaScript implementation
(function() {
  // Initialize Vercel Analytics using the web script injection method
  window.va = window.va || function () { 
    (window.vaq = window.vaq || []).push(arguments); 
  };
  
  // Load the analytics script
  var script = document.createElement('script');
  script.defer = true;
  script.src = '/_vercel/insights/script.js';
  document.head.appendChild(script);
})(); 