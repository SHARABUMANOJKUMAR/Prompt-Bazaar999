from flask_frozen import Freezer
from app import app
import os

# Configure the freezer
app.config['FREEZER_DESTINATION'] = 'build'
app.config['FREEZER_RELATIVE_URLS'] = True

freezer = Freezer(app)

@freezer.register_generator
def academy_modules():
    # Generate static pages for all academy modules
    for i in range(1, 18):
        yield f'academy_module{i}', {}

if __name__ == '__main__':
    freezer.freeze()
