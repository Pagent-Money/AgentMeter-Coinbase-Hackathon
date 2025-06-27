import { syncComponent } from 'components/DynamicComponent'

export const Landing = syncComponent('Landing', require('pages/Landing'))
export const Dashboard = syncComponent('Dashboard', require('pages/Dashboard'))
export const Docs = syncComponent('Docs', require('pages/Docs'))
export const Login = syncComponent('Login', require('pages/Login'))
export const Register = syncComponent('Register', require('pages/Register'))
export const CaseStudies = syncComponent('CaseStudies', require('pages/CaseStudies'))
export const CoinbaseHackathon = syncComponent('CoinbaseHackathon', require('pages/CoinbaseHackathon'))
