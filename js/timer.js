import AudioRecorder from 'https://cdn.jsdelivr.net/npm/audio-recorder-polyfill/index.js';

window.MediaRecorder = AudioRecorder;
AudioRecorder.prototype.mimeType= "audio/wav";

//circle start
let progressBar = document.querySelector('.e-c-progress');
let indicator = document.getElementById('e-indicator');
let pointer = document.getElementById('e-pointer');
let length = Math.PI * 2 * 100;

progressBar.style.strokeDasharray = length;

let recorder;
let audio; // здесь храниться аудио

function update(value, timePercent) {
    var offset = - length - length * value / (timePercent);
    progressBar.style.strokeDashoffset = offset;
    pointer.style.transform = `rotate(${360 * value / (timePercent)}deg)`;
};

//circle ends
const displayOutput = document.querySelector('.display-remain-time')
const pauseBtn = document.getElementById('pause');

let intervalTimer;
let timeLeft;
let wholeTime = 60; // manage this to set the whole time
let isPaused = false;
let isStarted = false;


update(wholeTime,wholeTime); //refreshes progress bar
displayTimeLeft(wholeTime);

function changeWholeTime(seconds){
    if ((wholeTime + seconds) > 0){
        wholeTime += seconds;
        update(wholeTime,wholeTime);
    }
}

function timer (seconds){ //counts time, takes seconds
    let remainTime = Date.now() + (seconds * 1000);
    displayTimeLeft(seconds);

    intervalTimer = setInterval(function(){
        timeLeft = Math.round((remainTime - Date.now()) / 1000);
        if(timeLeft < 0){
            clearInterval(intervalTimer);
            isStarted = false;
            document.getElementById("siri-container").style.display = "none";
            recorder.stop();
            displayTimeLeft(wholeTime);
            pauseBtn.classList.remove('pause');
            pauseBtn.classList.add('play');
            return ;
        }
        displayTimeLeft(timeLeft);
    }, 1000);
}
function pauseTimer(event){
    if(isStarted === false){
        timer(wholeTime);
        isStarted = true;
        pauseBtn.classList.remove('play');
        pauseBtn.classList.add('pause');

    }else if(isPaused){
        pauseBtn.classList.remove('play');
        pauseBtn.classList.add('pause');
        timer(timeLeft);
        isPaused = isPaused ? false : true;

    }
}

function displayTimeLeft (timeLeft){ //displays time on the input
    let minutes = Math.floor(timeLeft / 60);
    let seconds = timeLeft % 60;
    let displayString = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    displayOutput.textContent = displayString;
    update(timeLeft, wholeTime);
}

// настройка Siri Wavw
const siriWave = new SiriWave({
    container: document.getElementById("siri-container"),
    width: 200,
    height: 100,
    color: "#000",
    style: "ios9",
    amplitude: 3,
    speed: 0.3,
    ratio: 1
});



pauseBtn.addEventListener('click', () => {
    // начало записи
    if(pauseBtn.classList.contains("play")) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            recorder = new MediaRecorder(stream)
            document.getElementById("siri-container").style.display = "block";

            // Set record to <audio> when recording will be finished
            recorder.addEventListener('dataavailable', e => {
                audio = URL.createObjectURL(e.data)
                console.log(audio)
                document.getElementById("audioPlayer")
                    .innerHTML = `<audio src=${audio} controls type="audio/wav">`
            })

            pauseTimer();
            // Start recording
            recorder.start();
        })
    } else {
        // конец записи
        recorder.stop()
        displayTimeLeft(0)
        // Remove “recording” icon from browser tab
        recorder.stream.getTracks().forEach(i => i.stop())

        pauseBtn.classList.remove('pause');
        pauseBtn.classList.add('play');

        clearInterval(intervalTimer);
        isStarted = false;

        document.getElementById("siri-container").style.display = "none";

        displayTimeLeft(wholeTime);
    }
});