from flask import Flask, request, jsonify
import os

app = Flask(__name__, static_url_path='', static_folder='')

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/pages/<page_name>')
def render_page(page_name):
    return app.send_static_file(f'pages/{page_name}')

@app.route('/submit-form', methods=['POST'])
def submit_form():
    name = request.form['name']
    email = request.form['email']
    message = request.form['message']

    with open('logs/contact_form_submissions.txt', 'a') as f:
        f.write(f'{name}, {email}, {message}\n')

    return jsonify({'message': 'Form data has been received and recorded.'}), 200

if __name__ == '__main__':
    app.run()