/* eslint-disable consistent-return */
/* eslint-disable default-case */
import produce from 'immer';
import keycloak from 'keycloak';
import jwtDecode from 'jwt-decode';

// Action Types
export const LOGIN_SUCCESS = 'user/LOGIN_SUCCESS';
export const LOGIN_ERROR = 'user/LOGIN_ERROR';
export const LOGOUT = 'user/LOGOUT';
export const SERVER_ERROR = 'user/SERVER_ERROR';
export const UPDATE_ACCOUNT = 'user/UPDATE_ACCOUNT';

// Reducer
export const initialState = {
  isLogged: false,
  toLogin: true,
  loginError: false,
  serverError: false,
  username: '',
  language: 'fr',
  accessToken: undefined,
  account: {},
};

export default function reducer(inputState, action) {
  const state = inputState || initialState;
  return produce(state, (draft) => {
    switch (action.type) {
      case LOGIN_SUCCESS:
        draft.isLogged = true;
        draft.toLogin = false;
        draft.accessToken = action.accessToken;
        if (action.username !== undefined) {
          draft.username = action.username;
        }
        break;
      case LOGIN_ERROR:
        draft.loginError = action.withErrorMessage;
        draft.toLogin = true;
        break;
      case LOGOUT:
        return initialState;
      case SERVER_ERROR:
        draft.serverError = true;
        break;
      case UPDATE_ACCOUNT:
        draft.account = action.account;
        break;
    }
  });
}

// Action Creators
function loginSuccess(accessToken, username = undefined) {
  return {
    type: LOGIN_SUCCESS,
    accessToken,
    username,
  };
}

function loginError(withErrorMessage = true) {
  return {
    type: LOGIN_ERROR,
    withErrorMessage,
  };
}

function logoutUser() {
  return {
    type: LOGOUT,
  };
}

function serverError() {
  return {
    type: SERVER_ERROR,
  };
}

function updateAccount(account) {
  return {
    type: UPDATE_ACCOUNT,
    account,
  };
}

// Functions
export function logout() {
  return (dispatch) => {
    keycloak.logout();
    dispatch(logoutUser());
  };
}

export function refreshToken() {
  return async (dispatch) => {
    try {
      const isUpdated = await keycloak.updateToken(60);
      if (isUpdated) {
        const accessToken = keycloak.getToken();
        localStorage.setItem('access_token', accessToken);
        dispatch(loginSuccess(accessToken));
      }
      setTimeout(() => refreshToken()(dispatch), 60000);
    } catch (e) {
      logout();
      throw e;
    }
  };
}

export function login() {
  return async (dispatch) => {
    try {
      const accessToken = keycloak.getToken();
      const username = keycloak.getUsername();
      localStorage.setItem('access_token', accessToken);
      setTimeout(() => refreshToken()(dispatch), 60000);

      const decoded = jwtDecode(accessToken);
      const account = {
        id: decoded.id,
        username: decoded.preferred_username,
        firstName: decoded.given_name,
        lastName: decoded.family_name,
        email: decoded.email,
      };

      dispatch(updateAccount(account));
      dispatch(loginSuccess(accessToken, username));
      console.log('Connecté');
    } catch (e) {
      console.log('Login ERROR', e.response);
      dispatch(loginError());
    }
  };
}

export function attemptLoginOnLaunch() {
  return async (dispatch) => {
    try {
      await keycloak.initKeycloak(() => login()(dispatch));
    } catch (e) {
      if (!e.response) {
        // When server error and unreachable no code is send, e.response/status/code are empty
        console.log('Erreur serveur');
        dispatch(serverError());
      } else {
        console.log('Non authentifié :', e.message);
        dispatch(loginError(false));
      }
    }
  };
}
