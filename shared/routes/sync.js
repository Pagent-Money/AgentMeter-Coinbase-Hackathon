import { syncComponent } from 'components/DynamicComponent'

export const Landing = syncComponent('Landing', require('pages/Landing'))
export const Dashboard = syncComponent('Dashboard', require('pages/Dashboard'))
export const Chat = syncComponent('Chat', require('pages/Chat'))
export const LLMSearch = syncComponent('LLMSearch', require('pages/LLMSearch'))
