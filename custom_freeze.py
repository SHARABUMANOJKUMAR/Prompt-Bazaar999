import os
import shutil
from app import app

build_dir = 'build'
if os.path.exists(build_dir):
    shutil.rmtree(build_dir)
os.makedirs(build_dir, exist_ok=True)
os.makedirs(os.path.join(build_dir, 'academy'), exist_ok=True)

print("Starting custom static build for Netlify...")

with app.test_client() as client:
    if os.path.exists('static'):
        shutil.copytree('static', os.path.join(build_dir, 'static'))
    
    routes = {
        '/': 'index.html',
        '/gallery': 'prompt-gallery.html',
        '/login': 'login.html',
        '/signup': 'signup.html',
        '/tools': 'tools.html',
        '/profile': 'profile.html',
        '/admin/dashboard': 'admin-dashboard.html',
        '/academy/': 'academy.html',
        '/verify': 'verify.html',
        '/portfolio-viewer': 'portfolio-viewer.html',
    }
    
    for i in range(1, 18):
        routes[f'/academy/module{i}'] = f'academy/module{i}.html'
        
    for route, filename in routes.items():
        print(f"Generating {route} -> {filename}")
        response = client.get(route)
        if response.status_code == 200:
            filepath = os.path.join(build_dir, filename)
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            with open(filepath, 'wb') as f:
                f.write(response.data)
        else:
            print(f"Warning: Route {route} returned {response.status_code}")

print("Custom freeze completed successfully!")
