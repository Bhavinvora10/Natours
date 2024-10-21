/* eslint-disable */

import { loadStripe } from '@stripe/stripe-js';
import axios from 'axios';
import { showAlert } from './alerts';

const stripe = loadStripe(
    'pk_test_51Q7sr404IkWgy1ZP7KL5HlCljncKqR5jJpg1apa0dbsqll6u5xFhhc88n4oPRGNhwnOnHlwXMTHlgZU8no7ftZFO002ZWuJLGn'
);

export const bookTour = async (tourId) => {
    try {
        // 1) Get checkout session from server
        const session = await axios(
            `/api/v1/bookings/checkout-session/${tourId}`
        );

        // 2) Create checkout and charge credit card
        // await stripe.redirectToCheckout({
        //     sessionId: session.data.session.id,
        // });
        if (session.data.status === 'success') {
            window.open(session.data.session.url, '_blank');
        }
    } catch (err) {
        console.log(err);
        showAlert('error', err);
    }
};
