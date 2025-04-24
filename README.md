# Ghiblit.art

> Transform your photos into beautiful artwork with AI

![Ghiblit.art Screenshot](./screenshot.png)

## About Ghiblit

Ghiblit.art is a web app that transforms ordinary photos into stunning artwork inspired by various artistic styles including Ghibli, One Piece, Cyberpunk, Solo Leveling, Shinchan, Pixar, Dragon Ball, Manga, and Minecraft. Simply upload your image, select a style.
## Features

- **Multiple Art Styles**: Choose from various artistic styles including Ghibli, One Piece, Cyberpunk, Solo Leveling, Shinchan, Pixar, Dragon Ball, Manga, and Minecraft
- **Instant Transformation**: Upload and transform your images in seconds
- **User Accounts**: Google account integration for seamless login and registration
- **Credit System**: Affordable credit system

## Tech Stack

### Frontend
- **Framework**: Next.js with React
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **Authentication**: Google OAuth via @react-oauth/google
- **Deployment**: Vercel

### Backend
- **Framework**: Django/Django REST Framework
- **Database**: PostgreSQL (supabase)
- **Storage**: Supabase Storage
- **Authentication**: JWT (Simple JWT)
- **Image Processing**: OpenAI API, PIL (Python Imaging Library)
- **Payment Processing**: Dodo Payments
- **Deployment**: Render

## Local Development Setup

### Prerequisites
- Python 3.9+
- Node.js 16+
- npm or yarn
- OpenAI API key
- Google OAuth credentials

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/pranesh-j/ghibliz
cd ghibliz/backend/ghiblit

# Create a virtual environment
python -m venv env
source env/bin/activate  # On Windows, use `env\Scripts\activate`

# Install dependencies
pip install -r requirements.txt

# Create a .env file with necessary environment variables
# See .env.example for required variables

# Run migrations
python manage.py migrate

# Create default pricing plans
python manage.py create_pricing_plans

# Run the server
python manage.py runserver
```

### Frontend Setup

```bash
# Navigate to the frontend directory
cd ../../frontend/ghiblit

# Install dependencies
npm install  # or yarn install

# Create a .env.local file with necessary environment variables
# See .env.example for required variables

# Run the development server
npm run dev  # or yarn dev
```

## Deployment

The application is deployed with:
- Frontend hosted on Vercel
- Backend hosted on Render
- Database hosted on Supabase
- Storage provided by Supabase

## Environment Variables

### Backend (.env)
```
SECRET_KEY=your_django_secret_key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
OPENAI_API_KEY=your_openai_api_key
GOOGLE_CLIENT_ID=your_google_client_id
DATABASE_URL = your_supabase_url
SUPABASE_PROJECT_ID=your_supabase_project_id
SUPABASE_STORAGE_KEY=your_supabase_storage_key
SUPABASE_STORAGE_SECRET=your_supabase_storage_secret
SUPABASE_STORAGE_BUCKET=your_supabase_storage_bucket
DODO_API_KEY=your_dodo_api_key
DODO_WEBHOOK_SECRET=your_dodo_webhook_secret
DODO_TEST_MODE=True
DODO_SUCCESS_URL=http://localhost:3000/payment/success
DODO_FAILURE_URL=http://localhost:3000/payment/failed
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

## Key Directories

- **backend/ghiblit**: Django backend application
  - **api**: API endpoints and authentication
  - **images**: Image transformation logic
  - **payments**: Payment processing and credits system
  - **users**: User management
  - **config**: Django settings and configuration

- **frontend/ghiblit**: Next.js frontend application
  - **src/app**: Next.js pages and routes
  - **src/components**: React components
  - **src/contexts**: React context providers
  - **src/services**: API service modules
  - **public**: Static assets

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

For questions or support, please email [ghiblit.art@gmail.com](mailto:ghiblit.art@gmail.com).

---

Built with ❤️ by [Pranesh Jahagirdar](https://www.linkedin.com/in/pranesh-jahagirdar/)