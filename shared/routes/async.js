import { asyncComponent } from 'components/DynamicComponent'

export const Landing = asyncComponent(() => import('pages/Landing'/* webpackChunkName: 'Landing' */))
export const Dashboard = asyncComponent(() => import('pages/Dashboard'/* webpackChunkName: 'Dashboard' */))
export const Chat = asyncComponent(() => import('pages/Chat'/* webpackChunkName: 'Chat' */))
