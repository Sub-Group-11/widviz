# widviz_backend.py - Backend server for WIDViz application (Witness Information & Data Visualization)
# This file provides API endpoints for user management, notes, goals, video summarization, and quizzes

import subprocess  # For running system commands (like yt-dlp)
import traceback   # For detailed error logging
import os          # For accessing environment variables and file operations
import sys         # System-specific parameters and functions
import json        # For JSON data handling
import time        # For time-related functions
import random      # For generating random numbers (OTP)
import base64      # For encoding PDFs to base64
import bcrypt      # For password hashing and verification
import calendar    # For calendar operations (goals feature)
import MySQLdb.cursors  # MySQL cursor types
import requests    # For making HTTP requests (to Ollama API)
from datetime import date, datetime, timedelta  # Date/time handling
from flask import Flask, request, render_template, redirect, url_for, session, flash, jsonify, Response  # Flask web framework
from flask_cors import CORS  # Cross-Origin Resource Sharing support
from flask_mysqldb import MySQL  # MySQL integration for Flask
from googleapiclient.discovery import build  # YouTube API client
from collections import defaultdict  # Dictionary with default values
from io import BytesIO  # In-memory binary streams
from reportlab.pdfgen import canvas  # PDF generation
from reportlab.lib.pagesizes import letter  # Standard page size for PDFs
from flask import current_app  # Access to current Flask application
from email.mime.text import MIMEText
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
# Audio processing imports
import whisper     # OpenAI's speech-to-text library
import torch       # PyTorch for deep learning

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://localhost:11434')

# Set device configuration for Whisper (use GPU if available)
device = "cuda" if torch.cuda.is_available() else "cpu"

# Initialize Flask application
app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing for all routes

# ===== Database Configuration =====
# Get MySQL credentials from environment variables
app.config['MYSQL_HOST'] = os.getenv('MYSQL_HOST')
app.config['MYSQL_USER'] = os.getenv('MYSQL_USER')
app.config['MYSQL_PASSWORD'] = os.getenv('MYSQL_PASSWORD')
app.config['MYSQL_DB'] = os.getenv('MYSQL_DB')
app.config['MYSQL_CURSORCLASS'] = os.getenv('MYSQL_CURSORCLASS')

# Secret key for session management
app.secret_key = os.getenv('SECRET_KEY')

# Initialize MySQL connection
mysql = MySQL(app)

# ===== Gmail Initiation ===== #

SCOPES = ['https://www.googleapis.com/auth/gmail.send']
CREDENTIALS_FILE = 'credentials.json'  # Use the correct credentials file
TOKEN_FILE = 'token.json'  # Path to store the OAuth token

# ===== YouTube API Setup ===== #
API_KEY = os.getenv('YOUTUBE_API_KEY')
youtube = build("youtube", "v3", developerKey=API_KEY, static_discovery=False)

# ===== Authentication Endpoints =====

@app.route('/api/login', methods=['POST'])
def login():
    """Authenticate users with email and password"""
    data = request.json
    email = data.get('email')
    password = data.get('password')

    # Validate input
    if not email or not password:
        return jsonify({"success": False, "message": "Both fields are required."})

    # Check database for user
    cur = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cur.execute("SELECT * FROM users WHERE email = %s", [email])
    user = cur.fetchone()
    cur.close()

    # Handle user not found
    if not user:
        return jsonify({"success": False, "message": "No account found with this email."})

    # Verify password
    if not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
        return jsonify({"success": False, "message": "Incorrect password."})

    # Successful login response
    return jsonify({
        "success": True,
        "message": "Login successful!",
        "user": {
            "email": email,
            "username": user['username']
        }
    })

@app.route('/api/signup', methods=['POST'])
def signup():
    """Create new user accounts"""
    data = request.json
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    # Validate input
    if not username or not email or not password:
        return jsonify({"success": False, "message": "All fields are required."})

    # Check for existing user
    cur = mysql.connection.cursor()
    cur.execute("SELECT * FROM users WHERE email = %s", [email])
    existing_user = cur.fetchone()
    cur.close()

    # Handle duplicate email
    if existing_user:
        return jsonify({"success": False, "message": "Account already exists."})

    # Create password hash and insert new user
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    cur = mysql.connection.cursor()
    cur.execute("INSERT INTO users (username, email, password) VALUES (%s, %s, %s)",
                (username, email, hashed_password))
    mysql.connection.commit()
    cur.close()

    return jsonify({"success": True, "message": "Account created successfully."})

@app.route('/api/forgot_password', methods=['POST'])
def forgot_password():
    """Initiate password reset process (sends OTP)"""
    data = request.json
    email = data.get('email')

    if not email:
        return jsonify({"success": False, "message": "Email is required."})

    # Verify email exists
    cur = mysql.connection.cursor()
    cur.execute("SELECT * FROM users WHERE email = %s", [email])
    user = cur.fetchone()
    cur.close()

    if user:
        # Generate 6-digit OTP (in real app, send via email)
        otp = random.randint(100000, 999999)
        send_email(email, 'Password Reset OTP', f'Your OTP is {otp}.')
        return jsonify({
            "success": True, 
            "message": "OTP generated.",
            "otp": otp,  # In production, don't return OTP in response!
            "email": email
})
    return jsonify({"success": False, "message": "Email not found."})

@app.route('/api/validate_otp', methods=['POST'])
def validate_otp():
    """Verify OTP for password reset"""
    data = request.json
    email = data.get('email')
    otp = data.get('otp')
    provided_otp = data.get('provided_otp')

    # Compare OTPs
    if int(otp) == int(provided_otp):
        return jsonify({"success": True, "message": "OTP validated successfully."})
    
    return jsonify({"success": False, "message": "Invalid OTP."})

@app.route('/api/reset_password', methods=['POST'])
def reset_password():
    """Update password after OTP validation"""
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not password:
        return jsonify({"success": False, "message": "Password is required."})

    # Hash and update password
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    cur = mysql.connection.cursor()
    cur.execute("UPDATE users SET password = %s WHERE email = %s",
                (hashed_password, email))
    mysql.connection.commit()
    cur.close()

    return jsonify({"success": True, "message": "Password reset successful."})

# ===== Notes Endpoints =====

@app.route('/api/notes', methods=['GET'])
def get_notes():
    """Retrieve all notes for a user"""
    email = request.args.get('email')
    
    if not email:
        return jsonify({"success": False, "message": "Email is required."})
    
    # Fetch notes from database
    cur = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cur.execute("SELECT id, title, content, created_at FROM notes WHERE user_email = %s", (email,))
    user_notes = cur.fetchall()
    cur.close()
    
    # Convert datetime to string for JSON serialization
    for note in user_notes:
        if 'created_at' in note and note['created_at']:
            note['created_at'] = note['created_at'].strftime('%Y-%m-%d %H:%M:%S')
    
    return jsonify({"success": True, "notes": user_notes})

@app.route('/api/notes/add', methods=['POST'])
def add_note():
    """Create a new note"""
    data = request.json
    email = data.get('email')
    title = data.get('title')
    content = data.get('content')
    
    if not email or not title:
        return jsonify({"success": False, "message": "Email and title are required."})
    
    # Insert new note
    cur = mysql.connection.cursor()
    cur.execute("INSERT INTO notes (user_email, title, content) VALUES (%s, %s, %s)", 
                (email, title, content))
    mysql.connection.commit()
    note_id = cur.lastrowid
    cur.close()
    
    return jsonify({"success": True, "message": "Note added successfully.", "id": note_id})

@app.route('/api/notes/edit', methods=['POST'])
def edit_note():
    """Update an existing note"""
    data = request.json
    note_id = data.get('id')
    title = data.get('title')
    content = data.get('content')
    
    if not note_id or not title:
        return jsonify({"success": False, "message": "Note ID and title are required."})
    
    # Update note in database
    cur = mysql.connection.cursor()
    cur.execute("UPDATE notes SET title = %s, content = %s WHERE id = %s", 
                (title, content, note_id))
    mysql.connection.commit()
    cur.close()
    
    return jsonify({"success": True, "message": "Note updated successfully."})

@app.route('/api/notes/delete', methods=['POST'])
def delete_note():
    """Delete a note"""
    data = request.json
    note_id = data.get('id')
    
    if not note_id:
        return jsonify({"success": False, "message": "Note ID is required."})
    
    # Delete note from database
    cur = mysql.connection.cursor()
    cur.execute("DELETE FROM notes WHERE id = %s", (note_id,))
    mysql.connection.commit()
    cur.close()
    
    return jsonify({"success": True, "message": "Note deleted successfully."})

@app.route('/api/notes/export_pdf', methods=['GET'])
def export_pdf():
    """Export a note as PDF"""
    note_id = request.args.get('id')
    email = request.args.get('email')
    
    if not note_id or not email:
        return jsonify({"success": False, "message": "Note ID and email are required."})
    
    # Fetch note from database
    cur = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cur.execute("SELECT title, content FROM notes WHERE id = %s AND user_email = %s", 
                (note_id, email))
    note = cur.fetchone()
    cur.close()
    
    if not note:
        return jsonify({"success": False, "message": "Note not found."})
    
    # Prepare note content
    title = note["title"] or "Untitled Note"
    content = note["content"] or "No content"
    
    # Create PDF in memory
    pdf_buffer = BytesIO()
    p = canvas.Canvas(pdf_buffer, pagesize=letter)
    width, height = letter
    
    # PDF layout configuration
    y_position = height - 50
    left_margin = 50
    
    # Add title
    p.setFont("Helvetica-Bold", 14)
    p.drawString(left_margin, y_position, title)
    y_position -= 20
    
    # Add wrapped content
    p.setFont("Helvetica", 12)
    from textwrap import wrap
    wrapped_content = wrap(content, width=80)
    
    # Handle multi-page content
    for line in wrapped_content:
        if y_position <= 50:  # New page when space runs out
            p.showPage()
            p.setFont("Helvetica", 12)
            y_position = height - 50
        
        p.drawString(left_margin, y_position, line)
        y_position -= 15
    
    p.save()
    pdf_buffer.seek(0)
    
    # Encode PDF for API response
    pdf_base64 = base64.b64encode(pdf_buffer.getvalue()).decode('utf-8')
    
    return jsonify({
        "success": True, 
        "pdf": pdf_base64,
        "filename": f"{title.replace(' ', '_')}.pdf"
    })

# ===== Goals Endpoints =====

@app.route('/api/goals', methods=['GET'])
def get_goals():
    """Get goals and calendar data for a month"""
    email = request.args.get('email')
    month = request.args.get('month', datetime.today().month, type=int)
    year = request.args.get('year', datetime.today().year, type=int)
    
    if not email:
        return jsonify({"success": False, "message": "Email is required."})
    
    # Fetch goals for the month
    cur = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cur.execute("""
        SELECT id, goal_text, DATE(goal_date) as goal_date, status 
        FROM goals 
        WHERE email = %s AND MONTH(goal_date) = %s AND YEAR(goal_date) = %s
    """, (email, month, year))
    
    goals = cur.fetchall()
    cur.close()
    
    # Format dates for JSON
    for goal in goals:
        if goal.get('goal_date'):
            goal['goal_date'] = goal['goal_date'].strftime('%Y-%m-%d')
    
    # Generate calendar structure
    cal = calendar.Calendar(firstweekday=0)
    month_days = list(cal.itermonthdates(year, month))
    today = date.today()
    calendar_weeks = []
    week_data = []
    
    # Organize days into weeks with goal data
    for day in month_days:
        if len(week_data) == 7:
            calendar_weeks.append(week_data)
            week_data = []
        
        day_str = day.strftime('%Y-%m-%d')
        day_goals = [g for g in goals if g['goal_date'] == day_str]
        
        week_data.append({
            'date': day.day,
            'full_date': day_str,
            'today': day == today,
            'in_current_month': day.month == month,
            'goals': day_goals
        })
    
    if week_data:
        calendar_weeks.append(week_data)
    
    return jsonify({
        "success": True,
        "calendar_weeks": calendar_weeks,
        "current_month": month,
        "current_year": year,
        "current_month_name": calendar.month_name[month]
    })

@app.route('/api/goals/add', methods=['POST'])
def add_goal():
    """Add a new goal"""
    data = request.json
    email = data.get('email')
    goal_text = data.get('goal_text')
    goal_date = data.get('goal_date')
    
    if not email or not goal_text or not goal_date:
        return jsonify({"success": False, "message": "Email, goal text, and date are required."})
    
    # Validate date (can't add goals for past dates)
    goal_date_obj = datetime.strptime(goal_date, '%Y-%m-%d').date()
    today_date = datetime.today().date()
    
    if goal_date_obj < today_date:
        return jsonify({"success": False, "message": "You cannot add goals for past dates!"})
    
    # Insert new goal
    cur = mysql.connection.cursor()
    cur.execute("INSERT INTO goals (email, goal_text, goal_date, status) VALUES (%s, %s, %s, 'pending')", 
                (email, goal_text, goal_date))
    mysql.connection.commit()
    goal_id = cur.lastrowid
    cur.close()
    
    return jsonify({"success": True, "message": "Goal added successfully.", "id": goal_id})

@app.route('/api/goals/complete', methods=['POST'])
def complete_goal():
    """Mark a goal as completed"""
    data = request.json
    goal_id = data.get('id')
    
    if not goal_id:
        return jsonify({"success": False, "message": "Goal ID is required."})
    
    # Update goal status
    cur = mysql.connection.cursor()
    cur.execute("UPDATE goals SET status = 'completed' WHERE id = %s", (goal_id,))
    mysql.connection.commit()
    cur.close()
    
    return jsonify({"success": True, "message": "Goal marked as completed."})

@app.route('/api/goals/delete', methods=['POST'])
def delete_goal():
    """Delete a goal"""
    data = request.json
    goal_id = data.get('id')
    
    if not goal_id:
        return jsonify({"success": False, "message": "Goal ID is required."})
    
    # Delete goal from database
    cur = mysql.connection.cursor()
    cur.execute("DELETE FROM goals WHERE id = %s", (goal_id,))
    mysql.connection.commit()
    cur.close()
    
    return jsonify({"success": True, "message": "Goal deleted successfully."})

# ===== Reset Password-OTP =====

def save_credentials(credentials):
    """Save credentials to a file."""
    with open(TOKEN_FILE, 'w') as token:
        token.write(credentials.to_json())


def load_credentials():
    """Load credentials from a file."""
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, 'r') as token:
            credentials_data = json.load(token)
            credentials = Credentials.from_authorized_user_info(credentials_data)
            if credentials and credentials.valid:
                return credentials
            elif credentials and credentials.expired and credentials.refresh_token:
                credentials.refresh(Request())
                save_credentials(credentials)
                return credentials
    return None


def gmail_service():
    """Authenticate and return Gmail API service instance."""
    credentials = load_credentials()

    if not credentials:
        # If credentials are missing or expired, start the OAuth flow.
        flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
        credentials = flow.run_local_server(port=0)
        save_credentials(credentials)

    service = build('gmail', 'v1', credentials=credentials)
    return service


def send_email(to_email, subject, content):
    """Send an email using Gmail API."""
    try:
        service = gmail_service()
        message = MIMEText(content)
        message['to'] = to_email
        message['subject'] = subject
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
        body = {'raw': raw_message}
        service.users().messages().send(userId="me", body=body).execute()
        print(f"Email sent to {to_email}")
    except Exception as e:
        print(f"Error sending email: {e}")


# ===== YouTube and Video Processing Endpoints =====

@app.route('/api/search_videos', methods=['POST'])
def search_videos_api():
    """Search YouTube videos by query"""
    data = request.json
    query = data.get('query')
    max_results = data.get('max_results', 10)
    
    if not query:
        return jsonify({"success": False, "message": "Query is required."})
    
    try:
        # YouTube Data API request
        search_request = youtube.search().list(
            q=query,
            part="snippet",
            maxResults=max_results,
            type="video"
        )
        search_response = search_request.execute()
        
        # Format results
        videos = []
        for item in search_response['items']:
            video_id = item.get('id', {}).get('videoId')
            if not video_id:
                app.logger.warning(f"Missing videoId in item: {item}")
                continue  # skip this item

            videos.append({
                "video_id": video_id,
                "title": item['snippet']['title'],
                "description": item['snippet']['description'],
                "channel_title": item['snippet']['channelTitle'],
                "url": f"https://www.youtube.com/watch?v={video_id}",
                "thumbnail": item['snippet']['thumbnails']['medium']['url']
            })

        
        return jsonify({"success": True, "videos": videos})
    except Exception as e:
        app.logger.error(f"YouTube API error: {str(e)}")
        return jsonify({"success": False, "message": f"Error searching videos: {str(e)}"})

def extract_video_id(url):
    """Extract YouTube video ID from various URL formats"""
    # Handle direct video ID
    if len(url) == 11 and all(c in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-' for c in url):
        return url
        
    # Regex patterns for different YouTube URL formats
    patterns = [
        r'(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})',
        r'(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([^"&?\/\s]{11})'
    ]
    
    import re
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    
    return None

def download_video(video_id):
    """Download YouTube audio using yt-dlp"""
    try:
        output_file = f"temp_{video_id}.wav"
        
        # Verify yt-dlp installation
        try:
            subprocess.run(["yt-dlp", "--version"], check=True, 
                          capture_output=True, text=True)
        except (subprocess.SubprocessError, FileNotFoundError) as e:
            current_app.logger.error(f"yt-dlp check failed: {str(e)}")
            raise RuntimeError("yt-dlp not installed. Install with: pip install yt-dlp")

        # Download audio as WAV
        result = subprocess.run(
            [
                "yt-dlp",
                "--no-warnings",
                "-x",  # Extract audio
                "--audio-format", "wav",
                "--audio-quality", "0",  # Best quality
                "-o", output_file,
                "--max-filesize", "100M",  # Size limit
                f"https://www.youtube.com/watch?v={video_id}"
            ],
            capture_output=True,
            text=True,
            timeout=300  # 5-minute timeout
        )

        # Handle download errors
        if result.returncode != 0:
            error_msg = f"Download failed: {result.stderr[:500]}"
            current_app.logger.error(error_msg)
            raise RuntimeError(error_msg)
            
        if not os.path.exists(output_file):
            raise FileNotFoundError(f"Output file missing: {output_file}")
            
        return output_file
        
    except subprocess.TimeoutExpired as e:
        current_app.logger.error(f"Timeout: {str(e)}")
        raise RuntimeError("Download took too long (max 5 minutes)")
    except Exception as e:
        current_app.logger.error(f"Download error: {str(e)}")
        raise RuntimeError(f"Download failed: {str(e)}")

def transcribe_with_whisper(file_path):
    """Transcribe audio using OpenAI's Whisper"""
    try:
        model = whisper.load_model("base", device="cuda")  # Base model (faster)
        result = model.transcribe(file_path)
        return result["text"]
    except Exception as e:
        current_app.logger.error(f"Whisper error: {str(e)}")
        import traceback 
        traceback.print_exc()
        raise RuntimeError(f"Transcription failed: {repr(e)}")


def get_transcript_from_youtube(video_id):
    """Get captions directly from YouTube if available"""
    try:
        # Get available captions
        captions_response = youtube.captions().list(
            part="snippet",
            videoId=video_id
        ).execute()
        
        if not captions_response.get('items'):
            return None
            
        # Use first available caption track
        caption_id = captions_response['items'][0]['id']
        
        # Download captions in SRT format
        caption = youtube.captions().download(
            id=caption_id,
            tfmt="srt"
        ).execute()
        
        # Extract text from SRT format
        import re
        text_only = re.sub(r'\d+\n\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}\n', '', caption)
        text_only = re.sub(r'^\d+$', '', text_only, flags=re.MULTILINE)
        transcript = ' '.join(text_only.split('\n')).strip()
        
        return transcript
    except Exception as e:
        app.logger.error(f"Error getting transcript from YouTube: {str(e)}")
        return None

def summarize_with_ollama(text, model="mistral"):
    """Generate summary using Ollama's Mistral model"""
    try:
        # Verify Ollama is running
        try:
            response = requests.get(OLLAMA_URL + "/api/tags", timeout=5)
            if response.status_code != 200:
                return "Error: Ollama server is not running"
        except requests.exceptions.RequestException:
            return "Error: Could not connect to Ollama"

        # Prepare prompt with text truncation
        prompt = f"""
        You are an expert video summarizer. Summarize concisely:
        {text[:9000]}  
        """
            #text input limit
        # Request summary from Ollama
        response = requests.post(
            OLLAMA_URL + "/api/generate",
            json={"model": model, "prompt": prompt, "stream": False},
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            summary = result.get("response", "").strip()
            
            # Format for HTML display
            summary = summary.replace("\n", "<br>")  # Line breaks
            summary = summary.replace("- ", "• ")    # Bullet points
            return summary
            
        return "Error: Failed to generate summary"

    except Exception as e:
        return f"Error: {str(e)}"
    
@app.route('/api/summarize_video', methods=['POST'])
def summarize_video_api():
    """Generate summary and transcript for a YouTube video"""
    data = request.json
    video_id = data.get('video_id')
    
    if not video_id:
        return jsonify({"success": False, "message": "Video ID is required."})
    
    # Extract video ID from URL if needed
    extracted_id = extract_video_id(video_id)
    if not extracted_id:
        return jsonify({"success": False, "message": "Invalid YouTube video ID or URL."})
    video_id = extracted_id
    
    try:
        # First try to get official captions
        transcript = get_transcript_from_youtube(video_id)
        
        # Fallback to Whisper transcription if no captions
        if not transcript:
            current_app.logger.info(f"No YouTube transcript for {video_id}, using Whisper...")
            audio_path = download_video(video_id)
            
            try:
                transcript = transcribe_with_whisper(audio_path)
            finally:
                # Clean up audio file
                if os.path.exists(audio_path):
                    os.remove(audio_path)
        
        # Generate summary using Ollama
        summary = summarize_with_ollama(transcript)
        
        return jsonify({
            "success": True,
            "transcript": transcript,
            "summary": summary
        })
    except Exception as e:
        current_app.logger.error(f"Summarization error: {str(e)}")
        return jsonify({"success": False, "message": f"Error: {str(e)}"})

@app.route('/api/generate_quiz', methods=['POST'])
def generate_quiz_api():
    """Generate quiz questions from video transcript"""
    data = request.json
    transcript = data.get('transcript')  # Transcript from summarization endpoint
    
    if not transcript:
        return jsonify({"success": False, "message": "Transcript is required."})
    
    try:
        # Prepare prompt for quiz generation
        prompt = f"""Based on the following transcript, generate 5 multiple-choice quiz questions:
        
Format:  
1. [Question 1]?
    a) [Option A]
    b) [Option B]
    c) [Option C]
    d) [Option D]
Answer: [Correct Option]

Transcript content:
{transcript[:7000]}  # Use first 2000 characters"""

        # Verify Ollama is running
        try:
            response = requests.get(OLLAMA_URL + "/api/tags", timeout=5)
            if response.status_code != 200:
                return jsonify({"success": False, "message": "Ollama server is not running. Please start Ollama."})
        except requests.exceptions.RequestException:
            return jsonify({"success": False, "message": "Could not connect to Ollama. Please make sure it's running."})
        
        # Request quiz from Ollama
        response = requests.post(
            OLLAMA_URL + "/api/generate",
            json={
                "model": "mistral",
                "prompt": prompt,
                "stream": False
            },
            timeout=60
        )
        
        if response.status_code == 200:
            quiz_text = response.json().get("response", "Quiz generation failed.")
            
            # Parse generated quiz text
            questions = []
            current_question = None
            
            for line in quiz_text.split("\n"):
                line = line.strip()
                
                # Question detection
                if line and line[0].isdigit() and "." in line:
                    if current_question:
                        questions.append(current_question)
                    
                    question_text = line.split(".", 1)[1].strip()
                    if not question_text.endswith("?"):
                        question_text += "?"
                    current_question = {"question": question_text, "options": [], "answer": ""}
                
                # Option detection
                elif line.startswith(("a)", "b)", "c)", "d)")):
                    if current_question:
                        current_question["options"].append(line)
                
                # Answer detection
                elif "Answer:" in line:
                    if current_question:
                        current_question["answer"] = line.split("Answer:")[-1].strip()
            
            # Add final question
            if current_question:
                questions.append(current_question)
            
            return jsonify({"success": True, "quiz": questions})
        else:
            return jsonify({"success": False, "message": f"Error from Ollama API: {response.text}"})
    except requests.exceptions.Timeout:
        return jsonify({"success": False, "message": "Ollama request timed out. Try with a shorter transcript."})
    except Exception as e:
        app.logger.error(f"Error in generate_quiz_api: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({"success": False, "message": f"Error generating quiz: {str(e)}"})

# ===== Database Initialization & Server Startup =====
if __name__ == "__main__":
    # Create database tables if they don't exist
    with app.app_context():
        cur = mysql.connection.cursor()
        
        # Users table
        cur.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Notes table
        cur.execute('''
            CREATE TABLE IF NOT EXISTS notes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_email VARCHAR(100) NOT NULL,
                title VARCHAR(255) NOT NULL,
                content TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_email) REFERENCES users(email)
            )
        ''')
        
        # Goals table
        cur.execute('''
            CREATE TABLE IF NOT EXISTS goals (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(100) NOT NULL,
                goal_text TEXT NOT NULL,
                goal_date DATE NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (email) REFERENCES users(email)
            )
        ''')
        
        mysql.connection.commit()
        cur.close()
    
    # Start Flask development server
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)