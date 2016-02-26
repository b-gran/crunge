import React from 'react';
import { render } from 'react-dom';
import { browserHistory, match, Router } from 'react-router';
import attach from 'fastclick';

import App from './lib/components/App';
import routes from './lib/routes';

const appContainer = document.getElementById('app')

const context = {
    // Allows children to set the page title.
    onSetTitle: value => document.title = value,

    // Allows children to create meta tags.
    onSetMeta: (name, content) => {
        // Remove and create a new <meta /> tag in order to make it work
        // with bookmarks in Safari
        const elements = document.getElementsByTagName('meta');
        Array.prototype.slice.call(elements).forEach((element) => {
            if (element.getAttribute('name') === name) {
                element.parentNode.removeChild(element);
            }
        });
        const meta = document.createElement('meta');
        meta.setAttribute('name', name);
        meta.setAttribute('content', content);
        document.getElementsByTagName('head')[0].appendChild(meta);
    },
};

// Render the page based on the current URL.
function run() {
    attach(document.body);

    // Determine location from URL
    const { pathname, search, hash } = window.location;
    const location = `${pathname}${search}${hash}`;

    // Use react-router to match the location and render the page.
    match({routes, location}, (error, redirectLocation, renderProps) => {
        render(
            <App context={context}>
                <Router {...renderProps} children={routes} history={browserHistory} />
            </App>,
            appContainer
        );
    });
};

document.addEventListener('DOMContentLoaded', run, false);
