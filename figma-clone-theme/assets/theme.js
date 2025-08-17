(function(){
  const toggles = document.querySelectorAll('[data-toggle]');
  toggles.forEach(function(btn){
    btn.addEventListener('click', function(){
      const target = document.querySelector(btn.getAttribute('data-toggle'));
      if(!target) return;
      const open = target.getAttribute('data-open') === 'true';
      target.setAttribute('data-open', String(!open));
    });
  });
})();