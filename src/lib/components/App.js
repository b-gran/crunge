import React, { PropTypes } from 'react';
import emptyFunction from 'fbjs/lib/emptyFunction';

/**
 * Holds the application context for the app.
 */
class App extends React.Component {

    static propTypes = {
        context: PropTypes.shape({
            onSetTitle: PropTypes.func,
            onSetMeta: PropTypes.func,
            onPageNotFound: PropTypes.func,
        }),
        children: PropTypes.element.isRequired,
    };

    static childContextTypes = {
        onSetTitle: PropTypes.func,
        onSetMeta: PropTypes.func,
        onPageNotFound: PropTypes.func,
    };

    getChildContext() {
        const context = this.props.context;
        return {
            onSetTitle: context.onSetTitle || emptyFunction,
            onSetMeta: context.onSetMeta || emptyFunction,
            onPageNotFound: context.onPageNotFound || emptyFunction,
        };
    }

    render() {
        const { children } = this.props;
        return React.Children.only(children);
    }
}

export default App;
