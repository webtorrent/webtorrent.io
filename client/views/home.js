module.exports = function () {
  var pre_l
  var content_l
  var fp_l
  var intro_l
  var s2_l

  $(document).ready(function () {

    pre_l = setTimeout(function () {
      $('#pre').fadeOut(600)
    }, 300)

    content_l = setTimeout(function () {
      $('#particles').fadeIn(400)
    }, 1500)

    fp_l = setTimeout(function () {
      $('#fp-nav').fadeIn(300)
    }, 1500)
    intro_l = setTimeout(function () {
      $('#s1').fadeIn(600)
    }, 2000)
    s2_l = setTimeout(function () {
      $('#s2').fadeIn(400)
    }, 1500)

    $('#content').fullpage({
      // Navigation
      menu: false,
      navigation: true,
      anchors: ['section1', 'section2'],
      scrollingSpeed: 700,
      animateAnchor: true,
      recordHistory: false
    })
  })
}
