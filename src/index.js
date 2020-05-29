const cover = document.querySelector('.cover')
const game = document.querySelector('.game')
const startButton = document.querySelector('#start')

startButton.onclick = () => {
  cover.style.display = 'none'
  game.style.display = 'flex'
  import('./game.js').then(() => {
    console.log('hola')
  })
}
