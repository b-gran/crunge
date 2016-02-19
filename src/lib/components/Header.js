import React, { Component, PropTypes } from 'react';
import { Nav, NavItem } from 'react-bootstrap';

class Header extends Component {

    render () {
        return (
            <Nav bsStyle='pills'>
                <NavItem eventKey={1} href=""> how? </NavItem>
                <NavItem eventKey={2} href=""> why? </NavItem>
            </Nav>
        );
    };

}

export default Header;