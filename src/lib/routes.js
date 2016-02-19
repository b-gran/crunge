import React from 'react';
import { IndexRoute, Route, Redirect } from 'react-router';
import HomePage from './components/HomePage';

export default (
  <Route>
    <Route path="/">
      <IndexRoute component={HomePage} />
    </Route>
    <Route path="*" component={HomePage} />
  </Route>
);
