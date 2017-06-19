function requestAddNote() {
    return function(dispatch) {
        dispatch({type: 'REQUEST_ADD_NOTE'});

        var r = new XMLHttpRequest();
        r.onreadystatechange = function() {
            if (r.readyState == XMLHttpRequest.DONE && r.status == 201) {
                var id = Number.parseInt(r.responseText);
                dispatch({type: 'RECEIVE_ADD_NOTE', id: id});
            }
        };

        r.open('POST', '/note');
        r.send();
    };
}

function requestUpdateNote(content) {
    return function(dispatch, getState) {
        dispatch({type: 'REQUEST_UPDATE_NOTE'});

        var r = new XMLHttpRequest();
        r.onreadystatechange = function() {
            if (r.readyState == XMLHttpRequest.DONE && r.status == 200) {
                var content = r.responseText;
                dispatch({type: 'RECEIVE_UPDATE_NOTE', content: content});
            }
        };

        r.open('PUT', '/note/' + getState().editing);
        r.setRequestHeader('Content-Type', 'application/json')
        r.send(JSON.stringify({content: content}));
    };
}

function requestDeleteNote(id) {
    return function(dispatch) {
        dispatch({type: 'REQUEST_DELETE_NOTE'});

        var r = new XMLHttpRequest();
        r.onreadystatechange = function() {
            if (r.readyState == XMLHttpRequest.DONE && r.status == 204) {
                dispatch({type: 'RECEIVE_DELETE_NOTE', id: id});
            }
        };

        r.open('DELETE', '/note/' + id);
        r.send();
    };
}

function notesApp(state, action) {
    switch(action.type) {
        case 'EDIT_NOTE':
            return Object.assign(
                {},
                state,
                {editing: action.id}
        );
        case 'REQUEST_ADD_NOTE':
            return state;
        case 'RECEIVE_ADD_NOTE':
            var new_note = {id: action.id, content: ""};
            var updated_notes = state.notes.slice();
            updated_notes.push(new_note);
            return Object.assign(
                {},
                state,
                {
                    notes: updated_notes,
                    editing: state.nextId
                }
            );
        case 'REQUEST_UPDATE_NOTE':
            return state;
        case 'RECEIVE_UPDATE_NOTE':
            var updated_notes = state.notes.map(function(note) {
                if (note.id == state.editing) {
                    note.content = action.content;
                }

                return note;
            });

            return Object.assign(
                {},
                state,
                {
                    notes: updated_notes,
                    editing: null
                }
            );
        case 'REQUEST_DELETE_NOTE':
            return state;
        case 'RECEIVE_DELETE_NOTE':
            var updated_notes = state.notes.filter(function(note) {
                return note.id != action.id;
            });

            return Object.assign(
                {},
                state,
                {
                    notes: updated_notes,
                    editing: null
                }
            );
        default:
            return state;
    }
}

var store = Redux.createStore(
    notesApp,
    initialState,
    Redux.applyMiddleware(ReduxThunk.default)
);

var e = React.createElement;

function Note(props, context) {
    var instance = Object.create(React.Component.prototype);

    instance.props = props;
    instance.context = context;
    instance.state = {};

    instance.editNote = function() {
        this.props.store.onEditNote(this.props.note.id);
    };

    instance.render = function() {
        console.log(this.props.store.editing == this.props.note.id);
        var el = e(
            'textarea', 
            {
                autoFocus: true,
                defaultValue: this.props.note.content,
                onBlur: this.props.store.onUpdateNote,
                readOnly: !(this.props.store.editing == this.props.note.id)
            }
        );

        return e(
            'div',
            {className: 'note', onClick: this.editNote.bind(this)},
            [
                e('span', {
                    className: 'delete-note',
                    onClick: this.props.store.onDeleteNote.bind(this, this.props.note.id)
                }, 'X'),
                el
            ]
        );
    };

    return instance;
}

function Notes(props, context) {
    var instance = Object.create(React.Component.prototype);

    instance.props = props;
    instance.context = context;
    instance.state = {};

    instance.render = function() {
        var props = this.props;
        var notes = this.props.notes.map(function(note) {
            return e(Note, {store: props, note: note, key: note.id});
        });

        notes.push(
            e('div', {key: 'add', className: 'note add-note', onClick: this.props.onAddNote}, "Add note")
        );

        return e('div', {className: 'notes'}, notes);
    };

    return instance;
}

function mapStateToProps(state) {
    return state;
}

function mapDispatchToProps(dispatch) {
    return {
        onEditNote: function(id) { dispatch({type: "EDIT_NOTE", id: id}); },
        onAddNote: function() { dispatch(requestAddNote()); },
        onUpdateNote: function(e) { dispatch(requestUpdateNote(e.target.value)); },
        onDeleteNote: function(id) { dispatch(requestDeleteNote(id)); }
    };
}

var NotesAppContainer = ReactRedux.connect(
    mapStateToProps,
    mapDispatchToProps
)(Notes);

ReactDOM.render(e(ReactRedux.Provider, {store: store}, e(NotesAppContainer)), document.getElementById('notes-container'));
