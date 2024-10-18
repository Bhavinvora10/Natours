/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

export const signup = async (name, email, password, passwordConfirm, role) => {
    try {
        const res = await axios({
            method: 'POST',
            url: 'http://127.0.0.1:3000/api/v1/users/signup',
            data: { name, email, password, passwordConfirm, role },
        });

        if (res.data.status === 'success') {
            showAlert('success', 'User created successfully');
            window.setTimeout(() => {
                location.assign('/login');
            }, 1500);
        }
    } catch (err) {
        console.info(err);
        showAlert('error', err.response.data.message);
    }
};

export const login = async (email, password) => {
    try {
        const res = await axios({
            method: 'POST',
            url: 'http://127.0.0.1:3000/api/v1/users/login',
            data: { email, password },
        });

        if (res.data.status === 'success') {
            showAlert('success', 'Logged in successfully');
            window.setTimeout(() => {
                location.assign('/');
            }, 1500);
        }
    } catch (err) {
        console.info(err);
        showAlert('error', err.response.data.message);
    }
};

export const logout = async () => {
    try {
        const res = await axios({
            method: 'GET',
            url: 'http://127.0.0.1:3000/api/v1/users/logout',
        });

        if (res.data.status === 'success') location.reload(true);
    } catch (err) {
        showAlert('error', 'Error logging out! Please try again');
    }
};
