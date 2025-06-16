import { asyncComponent } from 'components/DynamicComponent'

export const Landing = asyncComponent(() => import('pages/Landing'/* webpackChunkName: 'Landing' */))
