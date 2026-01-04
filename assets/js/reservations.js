// Reservation System
class ReservationSystem {
    constructor() {
        this.apiUrl = 'https://generalexpress-voyage-api.onrender.com/api';
        this.trips = [];
        this.selectedTrip = null;
        this.bookingData = {};
        
        this.init();
    }
    
    init() {
        this.loadTrips();
        this.setupEventListeners();
        this.setupModal();
    }
    
    async loadTrips() {
        try {
            const response = await fetch(`${this.apiUrl}/trips`);
            this.trips = await response.json();
            this.displayTrips(this.trips);
        } catch (error) {
            console.error('Erreur de chargement:', error);
            this.displayError();
        }
    }
    
    displayTrips(trips) {
        const container = document.getElementById('tripsList');
        if (!container) return;
        
        if (trips.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bus-slash"></i>
                    <h3>Aucun voyage disponible</h3>
                    <p>Veuillez modifier vos critères de recherche</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = trips.map(trip => this.createTripCard(trip)).join('');
        
        // Add event listeners to book buttons
        document.querySelectorAll('.book-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tripId = e.target.dataset.tripId;
                this.selectTrip(tripId);
            });
        });
    }
    
    createTripCard(trip) {
        const departureTime = new Date(trip.departure).toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const arrivalTime = new Date(trip.arrival).toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        return `
            <div class="trip-card">
                <div class="trip-header">
                    <div class="trip-route">
                        <h3>${trip.origin} → ${trip.destination}</h3>
                        <div class="trip-time">
                            <i class="fas fa-clock"></i>
                            <span>${departureTime} - ${arrivalTime}</span>
                        </div>
                    </div>
                    <span class="badge">${trip.type.toUpperCase()}</span>
                </div>
                
                <div class="trip-body">
                    <div class="trip-info">
                        <div class="trip-info-item">
                            <i class="fas fa-road"></i>
                            <span>Distance: ${trip.distance} km</span>
                        </div>
                        <div class="trip-info-item">
                            <i class="fas fa-clock"></i>
                            <span>Durée: ${trip.duration}</span>
                        </div>
                        <div class="trip-info-item">
                            <i class="fas fa-chair"></i>
                            <span>Places disponibles: ${trip.availableSeats}</span>
                        </div>
                    </div>
                    
                    <div class="trip-info">
                        <div class="trip-info-item">
                            <i class="fas fa-bus"></i>
                            <span>Bus: ${trip.busType}</span>
                        </div>
                        <div class="trip-info-item">
                            <i class="fas fa-snowflake"></i>
                            <span>Climatisation: ${trip.airConditioned ? 'Oui' : 'Non'}</span>
                        </div>
                        <div class="trip-info-item">
                            <i class="fas fa-wifi"></i>
                            <span>WiFi: ${trip.wifi ? 'Oui' : 'Non'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="trip-footer">
                    <div class="trip-pricing">
                        <div class="trip-price ${trip.type === 'vip' ? 'vip' : ''}">
                            <span class="trip-price-type">${trip.type === 'vip' ? 'VIP' : 'Classique'}</span>
                            <span class="trip-price-amount">${trip.price.toLocaleString()} FCFA</span>
                        </div>
                    </div>
                    <button class="btn btn-primary book-btn" data-trip-id="${trip.id}">
                        <i class="fas fa-ticket-alt"></i>
                        Réserver
                    </button>
                </div>
            </div>
        `;
    }
    
    selectTrip(tripId) {
        this.selectedTrip = this.trips.find(t => t.id == tripId);
        if (this.selectedTrip) {
            this.showBookingModal();
        }
    }
    
    showBookingModal() {
        const modal = document.getElementById('bookingModal');
        const form = document.getElementById('bookingDetailsForm');
        
        if (!modal || !form || !this.selectedTrip) return;
        
        // Populate form with trip details
        form.innerHTML = this.createBookingForm();
        
        // Show modal
        modal.classList.add('active');
        
        // Setup form validation
        this.setupBookingForm();
    }
    
    createBookingForm() {
        return `
            <div class="trip-summary">
                <h4>Résumé du voyage</h4>
                <div class="summary-grid">
                    <div class="summary-item">
                        <span>Itinéraire:</span>
                        <strong>${this.selectedTrip.origin} → ${this.selectedTrip.destination}</strong>
                    </div>
                    <div class="summary-item">
                        <span>Date:</span>
                        <strong>${new Date(this.selectedTrip.departure).toLocaleDateString('fr-FR')}</strong>
                    </div>
                    <div class="summary-item">
                        <span>Heure:</span>
                        <strong>${new Date(this.selectedTrip.departure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</strong>
                    </div>
                    <div class="summary-item">
                        <span>Type:</span>
                        <strong>${this.selectedTrip.type.toUpperCase()}</strong>
                    </div>
                    <div class="summary-item">
                        <span>Prix:</span>
                        <strong>${this.selectedTrip.price.toLocaleString()} FCFA</strong>
                    </div>
                </div>
            </div>
            
            <hr>
            
            <h4>Informations des passagers</h4>
            <div id="passengersContainer">
                ${this.createPassengerForm(1)}
            </div>
            
            <div class="form-control">
                <label for="addPassenger">
                    <i class="fas fa-user-plus"></i>
                    Ajouter un passager
                </label>
                <select id="addPassenger" onchange="reservationSystem.addPassengerField(this.value)">
                    <option value="1">1 passager</option>
                    <option value="2">2 passagers</option>
                    <option value="3">3 passagers</option>
                    <option value="4">4 passagers</option>
                </select>
            </div>
            
            <hr>
            
            <h4>Informations de contact</h4>
            <div class="form-row">
                <div class="form-control">
                    <label for="fullName">Nom complet</label>
                    <input type="text" id="fullName" required>
                </div>
                <div class="form-control">
                    <label for="email">Email</label>
                    <input type="email" id="email" required>
                </div>
                <div class="form-control">
                    <label for="phone">Téléphone</label>
                    <input type="tel" id="phone" required>
                </div>
            </div>
            
            <div class="form-control">
                <label>
                    <input type="checkbox" id="terms" required>
                    J'accepte les conditions générales et la politique de confidentialité
                </label>
            </div>
        `;
    }
    
    createPassengerForm(number) {
        let html = '';
        for (let i = 1; i <= number; i++) {
            html += `
                <div class="passenger-form">
                    <h5>Passager ${i}</h5>
                    <div class="form-row">
                        <div class="form-control">
                            <label for="passengerName${i}">Nom</label>
                            <input type="text" id="passengerName${i}" required>
                        </div>
                        <div class="form-control">
                            <label for="passengerID${i}">CNI/Passeport</label>
                            <input type="text" id="passengerID${i}" required>
                        </div>
                    </div>
                </div>
            `;
        }
        return html;
    }
    
    addPassengerField(count) {
        const container = document.getElementById('passengersContainer');
        container.innerHTML = this.createPassengerForm(parseInt(count));
    }
    
    setupBookingForm() {
        const form = document.getElementById('bookingDetailsForm');
        const confirmBtn = document.getElementById('confirmBooking');
        
        if (!form || !confirmBtn) return;
        
        confirmBtn.addEventListener('click', () => {
            if (this.validateBookingForm()) {
                this.processBooking();
            }
        });
    }
    
    validateBookingForm() {
        // Basic validation
        const requiredFields = [
            'fullName', 'email', 'phone', 'terms'
        ];
        
        for (const field of requiredFields) {
            const element = document.getElementById(field);
            if (!element || !element.value) {
                this.showToast('Veuillez remplir tous les champs obligatoires', 'error');
                return false;
            }
        }
        
        // Email validation
        const email = document.getElementById('email').value;
        if (!this.isValidEmail(email)) {
            this.showToast('Veuillez entrer un email valide', 'error');
            return false;
        }
        
        // Phone validation
        const phone = document.getElementById('phone').value;
        if (!this.isValidPhone(phone)) {
            this.showToast('Veuillez entrer un numéro de téléphone valide', 'error');
            return false;
        }
        
        return true;
    }
    
    async processBooking() {
        try {
            // Collect booking data
            const bookingData = {
                tripId: this.selectedTrip.id,
                passengers: this.collectPassengerData(),
                contact: {
                    name: document.getElementById('fullName').value,
                    email: document.getElementById('email').value,
                    phone: document.getElementById('phone').value
                },
                total: this.selectedTrip.price
            };
            
            // Save to localStorage for payment page
            localStorage.setItem('pendingBooking', JSON.stringify(bookingData));
            
            // Close modal and redirect to payment
            this.closeModal();
            window.location.href = 'paiement.html';
            
        } catch (error) {
            console.error('Erreur de réservation:', error);
            this.showToast('Erreur lors de la réservation', 'error');
        }
    }
    
    collectPassengerData() {
        const passengers = [];
        const passengerForms = document.querySelectorAll('.passenger-form');
        
        passengerForms.forEach((form, index) => {
            const name = document.getElementById(`passengerName${index + 1}`)?.value;
            const id = document.getElementById(`passengerID${index + 1}`)?.value;
            
            if (name && id) {
                passengers.push({ name, id });
            }
        });
        
        return passengers;
    }
    
    closeModal() {
        const modal = document.getElementById('bookingModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }
    
    setupEventListeners() {
        // Search form
        document.getElementById('tripSearchForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.filterTrips();
        });
        
        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });
        
        // Close modal on outside click
        document.getElementById('bookingModal')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeModal();
            }
        });
    }
    
    filterTrips() {
        const origin = document.getElementById('filterOrigin').value;
        const destination = document.getElementById('filterDestination').value;
        const date = document.getElementById('filterDate').value;
        const type = document.getElementById('filterType').value;
        
        let filtered = this.trips;
        
        if (origin) {
            filtered = filtered.filter(trip => trip.origin.toLowerCase() === origin);
        }
        
        if (destination) {
            filtered = filtered.filter(trip => trip.destination.toLowerCase() === destination);
        }
        
        if (date) {
            const searchDate = new Date(date).toDateString();
            filtered = filtered.filter(trip => 
                new Date(trip.departure).toDateString() === searchDate
            );
        }
        
        if (type) {
            filtered = filtered.filter(trip => trip.type === type);
        }
        
        this.displayTrips(filtered);
    }
    
    displayError() {
        const container = document.getElementById('tripsList');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Erreur de chargement</h3>
                    <p>Veuillez réessayer plus tard</p>
                </div>
            `;
        }
    }
    
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    
    isValidPhone(phone) {
        return /^[0-9\s\-\(\)\+]+$/.test(phone);
    }
    
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}-circle"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;
        container.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }
}

// Initialize reservation system
const reservationSystem = new ReservationSystem();