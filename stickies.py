from functools import wraps
from flask import abort, Flask, flash, jsonify, redirect, render_template, request, session, url_for

import redis

app = Flask(__name__)
app.config.from_pyfile('config.cfg')

conn = redis.Redis(
    host=app.config['DB']['host'],
    port=app.config['DB']['port'],
    db=app.config['DB']['db'],
    charset='utf-8',
    decode_responses=True
)


def requires_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if session.get('logged_in', False):
            return f(*args, **kwargs)
        return redirect(url_for('login'))
    return decorated


def api_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if session.get('logged_in', False):
            return f(*args, **kwargs)
        abort(403)
    return decorated


def get_all_notes():
    note_ids = conn.keys('note:*')
    return [
        {
            'id': int(note_id.split(':')[1]),
            'content': conn.hget(note_id, 'content')
        }
        for note_id
        in note_ids
    ]


@app.route("/")
@requires_auth
def index():
    return render_template('index.html', notes=get_all_notes())


@app.route("/notes")
@api_auth
def notes():
    return jsonify(get_all_notes())


@app.route("/note/<int:note_id>", methods=['GET', 'PUT', 'DELETE'])
@api_auth
def note(note_id):
    if not conn.exists('note:{}'.format(note_id)):
        return abort(404)
    if request.method == 'GET':
        return jsonify(conn.hgetall('note:{}'.format(note_id)))
    if request.method == 'PUT':
        new_content = request.json.get('content', '')
        conn.hset('note:{}'.format(note_id), 'content', new_content)
        return new_content, 200
    if request.method == 'DELETE':
        conn.delete('note:{}'.format(note_id))
        return '', 204


@app.route("/note", methods=['POST'])
@api_auth
def new_note():
    note_id = conn.incr('next_note_id')
    conn.hmset('note:{}'.format(note_id), {'content': ''})
    return str(note_id), 201


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        if request.form['password'] == app.config['PASSWORD']:
            session['logged_in'] = True
            return redirect(url_for('index'))
        flash('Wrong password')
    return render_template('login.html')

if __name__ == "__main__":
    app.config['DEBUG'] = True
    app.run()
