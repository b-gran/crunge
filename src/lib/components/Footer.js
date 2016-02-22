import React, { Component, PropTypes } from 'react';
import { Nav, NavItem } from 'react-bootstrap';

class Footer extends Component {
    static displayName = 'Footer';

    render () {
        return (
            <Nav bsStyle='pills'>
                <NavItem eventKey={1} href=""> github </NavItem>
            </Nav>
        );
    };

}

export default Footer;