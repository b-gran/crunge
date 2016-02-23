import React, { Component, PropTypes } from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

// Styles required by ReactCSSTransitionGroup
const animationStyles = (enterDirection, leaveDirection) => {
    function opposite (direction) {
        return {
            up: 'down',
            down: 'up',
            left: 'right',
            right: 'left'
        }[direction];
    }

    function stylesByDirection (direction) {
        const cssAnchor = {
            up: 'top',
            down: 'bottom',
            left: 'left',
            right: 'right'
        }[direction];

        const distance = 50;
        const distances = {
            initial: `${cssAnchor}: -${distance}px;`,
            final: `${cssAnchor}: 0;`,
            property: `${cssAnchor}`,
        }

        return distances;
    }

    const enterDistances = stylesByDirection(opposite(enterDirection)),
          leaveDistances = stylesByDirection(leaveDirection);

    return {
        __html: `
        .react-simple-notification.notification-transition-appear,
        .react-simple-notification.notification-transition-enter {
          opacity: 0.1;
          ${enterDistances.initial}
        }

        .react-simple-notification.notification-transition-appear-active,
        .react-simple-notification.notification-transition-enter-active {
          opacity: 1;
          ${enterDistances.final}

          transition-property: ${enterDistances.property}, opacity;
          transition-duration: 0.3s;
          transition-timing-function: ease;
        }


        .react-simple-notification.notification-transition-leave {
          opacity: 1;
          ${leaveDistances.final}
        }

        .react-simple-notification.notification-transition-leave-active {
          opacity: 0.1;
          ${leaveDistances.initial}

          transition-property: ${leaveDistances.property}, opacity;
          transition-duration: 0.3s;
          transition-timing-function: ease;
        }`,
    };
};

// Default styles for the notifications.
const defaultStyles = {
    position: 'relative',
    width: '100%',
    marginTop: '20px',

    borderRadius: '5px',
    background: '#ff687b',
    fontSize: '20px',
    color: 'white',

    padding: '12px',
};

const directions = [ 'left', 'right', 'up', 'down' ];

class Notification extends Component {
    static displayName = 'Notification';

    static propTypes = {
        // Which directions the notification enters and leaves from.
        enterDirection: PropTypes.oneOf(directions),
        leaveDirection: PropTypes.oneOf(directions),

        // Message to display in the notification
        message: PropTypes.string.isRequired,

        // How long should the notification be visible before hiding itself? In ms.
        // If duration isn't specified, the component will not hide itself.
        duration: PropTypes.number,

        // If true, an close button will be shown
        dismissible: PropTypes.bool,

        // Handler to call when the dismiss button is pressed
        onDismiss: PropTypes.func,
    };

    static defaultProps = {
        enterDirection: 'down',
        leaveDirection: 'up',
    };

    state = {
        visible: true,
    };

    constructor (props) {
        super(props);

        if (props.dismissible && !props.onDismiss)
            throw new Error('An onDismiss handler is required if the notification is dismissible');

        // A key is needed for the CSS transition.
        this.key = `${props.message}${Date.now()}`;
    };

    componentDidMount () {
        // Hide the notification automatically after props.duration
        if (this.props.duration)
            setTimeout(() => {
                this.setState({
                    visible: false,
                })
            }, this.props.duration);
    };

    render () {
        let { message } = this.props;
        return (
            <div>
                <style dangerouslySetInnerHTML= {
                           animationStyles(
                               this.props.enterDirection,
                               this.props.leaveDirection
                           )}
                />

                <ReactCSSTransitionGroup transitionName="notification-transition"
                                         transitionAppear={true}
                                         transitionAppearTimeout={300}
                                         transitionEnterTimeout={300}
                                         transitionLeaveTimeout={300} >
                    {
                        (this.state.visible)
                         ?  <div style={defaultStyles} key={this.key}
                                 className="react-simple-notification">
                                { message }

                                {
                                    (this.props.dismissible)
                                        ? <i className="fa fa-times"
                                             style={{ float: 'right', lineHeight: '1.3em' }}
                                             onClick={this.props.onDismiss}/>

                                        : ''
                                }
                            </div>
                            
                         : ''
                    }
                </ReactCSSTransitionGroup>
            </div>
        )
    };
};

export default Notification;