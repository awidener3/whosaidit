const csvFileInput = document.getElementById('csvFile')
const playBtn = document.getElementById('play')
const resetBtn = document.getElementById('reset')
const homeBtn = document.getElementById('home')
const uploadArea = document.getElementById('upload')
const gameArea = document.getElementById('game')
const messageCount = document.getElementById('messageCount')
const minWordsEl = document.getElementById('minWords')
const ignoreRepliesEl = document.getElementById('ignoreReplies')

const quoteData = []
let usernames
let score
let hiscore
let messages
let minWords
let ignoreReplies

if (localStorage.getItem('hiscore')) {
  hiscore = localStorage.getItem('hiscore')
} else {
  localStorage.setItem('hiscore', 0)
  hiscore = 0
}

if (localStorage.getItem('score')) {
  score = localStorage.getItem('score')
} else {
  localStorage.setItem('score', 0)
  score = 0
}

if (localStorage.getItem('messages')) {
  messages = JSON.parse(localStorage.getItem('messages'))
  messageCount.textContent = messages.length
} else {
  messageCount.textContent = 0
}

if (localStorage.getItem('minWords')) {
  minWords = parseInt(localStorage.getItem('minWords'))
  minWordsEl.value = minWords
} else {
  minWords = parseInt(minWordsEl.value)
  localStorage.setItem('minWords', minWords)
}

minWordsEl.addEventListener('change', () => {
  minWords = parseInt(minWordsEl.value)
  localStorage.setItem('minWords', minWords)
})

if (localStorage.getItem('ignoreReplies')) {
  ignoreReplies = localStorage.getItem('ignoreReplies') === 'true'
  ignoreRepliesEl.checked = ignoreReplies
} else {
  ignoreReplies = ignoreRepliesEl.checked
  localStorage.setItem('ignoreReplies', ignoreReplies)
}

ignoreRepliesEl.addEventListener('change', () => {
  ignoreReplies = ignoreRepliesEl.checked
  localStorage.setItem('ignoreReplies', ignoreReplies)
})

updateHiscore(hiscore)

if (localStorage.getItem('currentMessage')) {
  messages = JSON.parse(localStorage.getItem('messages'))
  start()
} else {
  home()
}

homeBtn.addEventListener('click', home)
playBtn.addEventListener('click', start)
resetBtn.addEventListener('click', reset)

// file selection
csvFileInput.addEventListener('change', handleFileSelect)
if (csvFileInput.files) {
  handleFileSelect({ target: csvFileInput })
}

function handleFileSelect(event) {
  const file = event.target.files[0]
  if (!file) return

  readSmallCsvFile(file)
}

function readSmallCsvFile(file) {
  const reader = new FileReader();

  // Called when file reading completes
  reader.onload = function (event) {
    const csvText = event.target.result; // Raw CSV text
    processCsvLines(csvText); // Split into lines and process
  };

  // Read the file as text (default encoding: UTF-8)
  reader.readAsText(file);
}

function processCsvLines(csvText) {
  const lines = csvText.split('\n')

  for (const line of lines) {
    if (line.trim() === '') continue

    const csv = Papa.parse(line)

    if (csv.errors.length) continue

    const data = {
      username: csv.data[0][0],
      message: csv.data[0][1]?.trim().substring(1, csv.data[0][1]?.trim().length - 1),
      timestamp: csv.data[0][2]?.trim(),
      game: csv.data[0][3]?.trim(),
      image: csv.data[0][4]?.trim(),
      streamTitle: csv.data[0][5]?.trim()
    }

    quoteData.push(data)
  }

  quoteData.shift() // remove rowname line
  messages = quoteData


  messageCount.textContent = messages.length
  localStorage.setItem('messages', JSON.stringify(messages))
}

// return to the start screen
function home() {
  uploadArea.style.display = 'flex'
  gameArea.style.display = 'none'

  if (localStorage.getItem('currentMessage')) {
    playBtn.textContent = 'Resume'
  } else {
    playBtn.textContent = 'New Game'
  }
}

function reset() {
  localStorage.removeItem('gamestats')
  localStorage.removeItem('currentMessage')

  updateCurrentScore(0)
  updateHiscore(0)

  home()
}

function createLifeline (id, text, cb) {
  const container = document.querySelector('#lifelines')
  const buttonContainer = document.createElement('li')
  const button = document.createElement('button')
  button.id = id
  button.innerHTML = text
  button.addEventListener('click', cb)

  buttonContainer.appendChild(button)
  container.appendChild(buttonContainer)
}

// begin the game loop
function start() {
  const question = document.getElementById('question')
  const optionsEl = document.getElementById('options')
  const option1 = document.getElementById('option1')
  const option2 = document.getElementById('option2')
  const option3 = document.getElementById('option3')
  const option4 = document.getElementById('option4')
  const lifelines = document.getElementById('lifelines')
  lifelines.innerHTML = ''

  let gamestats
  if (localStorage.getItem('gamestats')) {
    gamestats = JSON.parse(localStorage.getItem('gamestats'))
  } else {
    gamestats = {
      skips: 3,
      skipAllowed: true,
      showGameAllowed: true,
      removeTwoAllowed: true
    }

    localStorage.setItem('gamestats', JSON.stringify(gamestats))
  }

  let correctUser
  let falseUsers
  let currentMessage

  // handle answer selection
  optionsEl.addEventListener('click', handleOptionClick)

  usernames = [...new Set(messages.map(data => data.username))]

  uploadArea.style.display = 'none'
  gameArea.style.display = 'grid'

  if (gamestats.removeTwoAllowed) {
    createLifeline('5050', '50/50', handleRemoveTwo)
  }

  if (gamestats.showGameAllowed) {
    createLifeline('showGame', 'Show Game', handleShowGame)
  }

  if (gamestats.skipAllowed) {
    createLifeline('skip', `Skip x${gamestats.skips}`, handleSkip)
  }

  updateHiscore(hiscore)
  updateCurrentScore(score)
  playRound()

  function handleRemoveTwo(e) {
    e.target.remove()
    gamestats.removeTwoAllowed = false

    localStorage.setItem('gamestats', JSON.stringify(gamestats))

    for (let i = 0; i < 2; i++) {
      const falseUser = falseUsers[i]

      const option = document.querySelector(`.option[value="${falseUser}"]`)

      option.classList.add('fade')
    }
  }

  function handleShowGame(e) {
    e.target.remove()
    gamestats.showGameAllowed = false

    localStorage.setItem('gamestats', JSON.stringify(gamestats))

    showGame()
  }

  function handleSkip(e) {
    gamestats.skips--

    const correctEl = document.querySelector(`#options [value="${correctUser}"]`)
    correctEl.classList.add('correct')


    if (!document.querySelector('.gameInfo')) {
      showGame()
    }

    if (gamestats.skips <= 0) {
      e.target.remove()

      gamestats.skipAllowed = false
      localStorage.setItem('gamestats', JSON.stringify(gamestats))
    } else {
      // update skips
      e.target.textContent = `Skip x${gamestats.skips}`
      localStorage.setItem('gamestats', JSON.stringify(gamestats))
    }


    // remove item from memory
    localStorage.removeItem('currentMessage')

    setTimeout(() => {
      playRound()
    }, 3000)
  }

  function handleOptionClick(e) {
    if (e.target.classList.contains('option')) {

      for (const option of document.querySelectorAll('#options li button')) {
        option.disabled = true
      }

      const optionValue = e.target.textContent

      if (optionValue === correctUser) {
        answerCorrect(e.target)
      } else {
        const correctEl = document.querySelector(`#options [value="${correctUser}"]`)
        answerIncorrect(e.target, correctEl)
      }
    }
  }

  function shuffle(array) {
    let currentIndex = array.length

    while (currentIndex !== 0) {
      let randomIndex = Math.floor(Math.random() * currentIndex)
      currentIndex--

      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]]
    }

    return array
  }

  async function playRound() {
    // cleanup
    if (document.querySelector('.gameInfo')) {
      document.querySelector('.gameInfo').remove()
    }
    for (const el of document.querySelectorAll('.fade')) {
      el.classList.remove('fade')
    }
    for (const el of document.querySelectorAll('.correct')) {
      el.classList.remove('correct')
    }
    for (const el of document.querySelectorAll('.incorrect')) {
      el.classList.remove('incorrect')
    }

    currentMessage = ''

    if (localStorage.getItem('currentMessage')) {
      currentMessage = JSON.parse(localStorage.getItem('currentMessage'))
    } else {
      const filteredMessages = messages.filter(obj => {
        if (obj.message.split(' ').length < minWords) return false

        if (obj.message.startsWith('@') && ignoreReplies) return false

        if (obj.username === correctUser) return false

        return true
      })

      currentMessage = filteredMessages[Math.floor(Math.random() * filteredMessages.length)]
      localStorage.setItem('currentMessage', JSON.stringify(currentMessage))
    }


    const message = currentMessage.message
    correctUser = currentMessage.username
    falseUsers = getIncorrectUsers(correctUser)
    const options = shuffle([correctUser, ...falseUsers])

    question.textContent = message

    option1.textContent = options[0]
    option1.value = options[0]
    option1.disabled = false

    option2.textContent = options[1]
    option2.value = options[1]
    option2.disabled = false

    option3.textContent = options[2]
    option3.value = options[2]
    option3.disabled = false

    option4.textContent = options[3]
    option4.value = options[3]
    option4.disabled = false

    console.log('CHEATER! the correct user is', correctUser)
  }

  function showGame() {
    const container = document.createElement('article')
    container.classList.add('gameInfo')
    const image = document.createElement('img')
    image.src = currentMessage.image
    const gameName = document.createElement('p')
    gameName.textContent = currentMessage.game

    container.append(image, gameName)
    question.append(container)
  }

  function answerCorrect (correctEl) {
    // TODO: make a more "intense" correct sfx whenever the hiscore is broken
    const audio = new Audio('sounds/correct.mp3')
    audio.play()

    score++
    if (score > hiscore) {
      hiscore++
    }

    updateCurrentScore(score)
    updateHiscore(hiscore)

    // mark it as correct
    correctEl.classList.add('correct')

    if (!document.querySelector('.gameInfo')) {
      showGame()
    }

    // remove item from memory
    localStorage.removeItem('currentMessage')

    setTimeout(() => {
      playRound()
    }, 3000)
  }

  function answerIncorrect(wrongEl, correctEl) {
    const audio = new Audio('sounds/incorrect.mp3')
    audio.play()

    score = 0

    wrongEl.classList.add('incorrect')
    correctEl.classList.add('correct')


    if (!document.querySelector('.gameInfo')) {
      showGame()
    }

    // remove item from memory
    localStorage.removeItem('currentMessage')
    localStorage.removeItem('gamestats')

    optionsEl.removeEventListener('click', handleOptionClick)

    setTimeout(() => {
      home()
    }, 3000)
  }

  function getIncorrectUsers(correctUser, number = 3) {
    const incorrectUsernames = usernames.filter(username => username !== correctUser);

    // Ensure we do not try to select more usernames than are available
    const numberToSelect = Math.min(number, incorrectUsernames.length);

    for (let i = incorrectUsernames.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [incorrectUsernames[i], incorrectUsernames[j]] = [incorrectUsernames[j], incorrectUsernames[i]];
    }

    return incorrectUsernames.slice(0, numberToSelect);
  }
}

function updateCurrentScore(score) {
  localStorage.setItem('score', score)
  const scoreEl = document.getElementById('score')
  scoreEl.textContent = score
}

function updateHiscore(score) {
  localStorage.setItem('hiscore', score)

  const hiscoreEl = document.getElementById('hiscore')
  const homeHiscore = document.querySelector('#upload > .hiscore > span')

  hiscoreEl.textContent = hiscore
  homeHiscore.textContent = hiscore
}
