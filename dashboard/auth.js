const REGION = 'us-east-1';
const USER_POOL_ID = 'us-east-1_563PpNSEp';
const CLIENT_ID = '32e5rq3337fnsf4j8k4d6uuphm';

const endpoint = `https://cognito-idp.${REGION}.amazonaws.com/`;

async function cognitoRequest(target, body) {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-amz-json-1.1',
            'X-Amz-Target': target,
        },
        body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || data.__type || 'Request failed');
    }
    return data;
}

async function register(email, password) {
    return await cognitoRequest('AWSCognitoIdentityProviderService.SignUp', {
        ClientId: CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [{ Name: 'email', Value: email }],
    });
}

async function confirmSignUp(email, code) {
    return await cognitoRequest('AWSCognitoIdentityProviderService.ConfirmSignUp', {
        ClientId: CLIENT_ID,
        Username: email,
        ConfirmationCode: code,
    });
}

async function login(email, password) {
    const data = await cognitoRequest('AWSCognitoIdentityProviderService.InitiateAuth', {
        ClientId: CLIENT_ID,
        AuthFlow: 'USER_PASSWORD_AUTH',
        AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
        },
    });

    localStorage.setItem('idToken', data.AuthenticationResult.IdToken);
    localStorage.setItem('accessToken', data.AuthenticationResult.AccessToken);
    localStorage.setItem('refreshToken', data.AuthenticationResult.RefreshToken);
    return data;
}

async function forgotPassword(email) {
    return await cognitoRequest('AWSCognitoIdentityProviderService.ForgotPassword', {
        ClientId: CLIENT_ID,
        Username: email,
    });
}

async function confirmPassword(email, code, newPassword) {
    return await cognitoRequest('AWSCognitoIdentityProviderService.ConfirmForgotPassword', {
        ClientId: CLIENT_ID,
        Username: email,
        ConfirmationCode: code,
        Password: newPassword,
    });
}

function showError(message) {
    const error = document.getElementById('error');
    error.textContent = message;
    error.classList.remove('hidden');
}

function isAuthenticated() {
    return !!localStorage.getItem('idToken');
}

function logout() {
    localStorage.removeItem('idToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = 'login.html';
}
