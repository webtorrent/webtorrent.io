/* global $ */
module.exports = function () {
  $(document).ready(function () {
    setTimeout(function () {
      $('#pre').fadeOut(600)
    }, 300)

    setTimeout(function () {
      $('#particles').fadeIn(400)
    }, 1500)

    setTimeout(function () {
      $('#fp-nav').fadeIn(300)
    }, 1500)

    setTimeout(function () {
      $('#s1').fadeIn(600)
    }, 2000)

    setTimeout(function () {
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
