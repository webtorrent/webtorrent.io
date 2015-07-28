$(document).ready(function() {
  $('#particles').particleground({
    dotColor: '#ABD3DF',
    lineColor: '#ABD3DF',
    parallaxMultiplier: '10',
    parallax: false,
    proximity: 130,
    density: 7000,
  });
  $('.intro').css({
    'margin-top': -($('.intro').height() / 2)
  });
});