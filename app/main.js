import $ from 'jquery';
import { shell } from './shell.js';
import { mount } from './mission-control.js';
import './globals.css';
import './pages-fonts.css';

const root = $('#orbital-root').html(shell)[0];
mount(root);
