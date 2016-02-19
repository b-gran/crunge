import React, { Component, PropTypes } from 'react';
import Header from './Header';
import Footer from './Footer';

import { Grid } from 'react-bootstrap';

class Page extends Component {

    static propTypes = {
        children: PropTypes.element.isRequired,
        error: PropTypes.object,
    };

    render() {
        return !this.props.error ? (
            <Grid className="content">
                <Header />
                {this.props.children}
                <Footer />
            </Grid>
        )
            : this.props.children;
    };

};

export default Page;
