var statsObj;

javascript:(function(){
  var script=document.createElement('script');
  script.onload=function(){
    var stats=new Stats();
    statsObj = stats;
    document.body.appendChild(stats.dom);
    requestAnimationFrame(function loop(){
      stats.update();requestAnimationFrame(loop)
    });
  };
  script.src='lib/stats.min.js';
  document.head.appendChild(script);
})()
