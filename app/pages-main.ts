import { shell } from './shell';
import { mount } from './mission-control';
import './globals.css';
import './pages-fonts.css';

const root = document.getElementById('orbital-root')!;
root.innerHTML = shell;
mount(root);
