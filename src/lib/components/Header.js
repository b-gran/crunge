import React, { Component, PropTypes } from 'react';
import { Navbar, Grid, Nav, NavItem } from 'react-bootstrap';

class Header extends Component {

    render () {
        return (
            <Navbar fixedTop default>
                <Grid>
                    { /* Brand */ }
                    <Navbar.Header pageScroll>
                        <Navbar.Brand>
                            <a href="#"> crunge </a>
                        </Navbar.Brand>
                        <Navbar.Toggle />
                    </Navbar.Header>

                    { /* Links */ }
                    <Navbar.Collapse>
                        <Nav pullRight>
                            <NavItem eventKey={1}>how?</NavItem>
                            <NavItem eventKey={2}>why?</NavItem>
                        </Nav>
                    </Navbar.Collapse>
                </Grid>
            </Navbar>
        );
    };

}

export default Header;