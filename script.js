'use strict';

//Variables
const form = document.querySelector('.form');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const workoutsContainer = document.querySelector('.workouts');

class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);

    constructor(coords, distance, duration){
        this.coords = coords;
        this.distance = distance;
        this.duration = duration;
    }

    _setDescription(){
        //Prettier ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }
}

class Running extends Workout {
    type = 'running';
    constructor(coords, distance, duration, cadency){
        super(coords, distance, duration);
        this.cadency = cadency;
        this.type = 'running';
        this.calcPace();
        this._setDescription();
    }

    calcPace(){
        // km/h
        this.pace = this.duration / this.distance;
        return this.pace
    }
}

class Cycling extends Workout {
    type = 'cycling';
    constructor(coords, distance, duration, elevationGain){
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.type = 'cycling';
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed(){
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

const running1 = new Running([25,35], 40, 15, 20);
console.log(running1);

/////////////////////////////////////////////////////////
//APPLICATION ARCHITECTURE
class App {
    #map;
    #mapZoomLevel = 13
    #mapEvent;
    #workouts = [];

    constructor(){
        this._getPosition();
        this._getLocalStorage() //Getting workouts from LocalStorage
        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toogleElevationField.bind(this));
        workoutsContainer.addEventListener('click', this._moveToPosition.bind(this));

    }

    _getPosition(){
        navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function(){
            alert("Could't get your location");
        });
    }

    _loadMap(position){
        let {latitude} = position.coords;
        let {longitude} = position.coords;
        const coords = [latitude, longitude];
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);
                
        this.#map.on('click', this._showForm.bind(this));

        this.#workouts.forEach(work => {
            this._renderWorkoutMarker(work);
         });
    }

    _showForm(mapE){
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm(){
        form.style.display = 'none';
        form.classList.add('hidden');
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';

        setTimeout(() => {
            form.style.display = 'grid';
        },1000);
    }

    _toogleElevationField(){
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden'); 
    }

    _newWorkout(e){
        e.preventDefault();
        const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
        const allPositive = (...inputs) => inputs.every(inp => inp > 0);

        //Get data from form
        const inpType = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const {lat, lng} = this.#mapEvent.latlng;
        let workout;

        //If activity running
        if(inpType === 'running'){
            const cadence = +inputCadence.value;
            if(!validInputs(distance,duration, cadence) || !allPositive(distance,duration, cadence)) {
               return alert('Inputs have to be positive numbers');
            }

            workout = new Running([lat, lng], distance, duration, cadence);

        }

        //If activity cycling
        if(inpType === 'cycling'){
            const elevation = +inputElevation.value;
            if(!validInputs(distance,duration, elevation) || !allPositive(distance,duration)) {
               return alert('Inputs have to be positive numbers');
            }
            workout = new Cycling([lat, lng], distance, duration, elevation);
        }

        //Add new object to workout array
        this.#workouts.push(workout);

        //Render workout on map as marker
        this._renderWorkoutMarker(workout);

        //Render workout
        this._renderWorkout(workout);

        //Hide form + Clear input fields
        this. _hideForm();

        //Set local storage to all workouts
        this._setLocalStorage();
    }

    _renderWorkoutMarker(workout) {
        L.marker(workout.coords).addTo(this.#map)
        .bindPopup(L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            className: `${workout.type}-popup`
        }))
        .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️': '🚴‍♀️'} ${workout.description}`)
        .openPopup();
    }

    _renderWorkout(workout) {
        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️': '🚴‍♀️'}</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>`;

        if(workout.type === 'running'){
            html += `
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.pace.toFixed(1)}</span>
                <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">🦶🏼</span>
                <span class="workout__value">${workout.cadency}</span>
                <span class="workout__unit">spm</span>
            </div>
        </li>`
        }
        if(workout.type === 'cycling'){
            html += `
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.speed.toFixed(1)}</span>
                <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⛰</span>
                <span class="workout__value">${workout.elevationGain}</span>
                <span class="workout__unit">m</span>
            </div>
        </li>`
        }

        form.insertAdjacentHTML('afterend', html);
    } 

    _moveToPosition(e){
        const workoutEl = e.target.closest('.workout');
        if(!workoutEl) return;

        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);
        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        })
    }

    _setLocalStorage(){
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getLocalStorage(){
       const data =  JSON.parse(localStorage.getItem('workouts'));
       if(!data) return;

       this.#workouts = data;
       this.#workouts.forEach(work => {
          this._renderWorkout(work)
       });
    }

    reset(){
        localStorage.removeItem('workouts');
        location.reload();
    }
}
const app = new App();
app._getPosition();
newFeature();

function newFeature() {
    console.log('New feature');
}