import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import PublicApp from './App';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Public site root element is missing.');
createRoot(root).render(<StrictMode><PublicApp /></StrictMode>);
