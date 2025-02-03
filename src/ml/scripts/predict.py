import sys
import json
import joblib
import numpy as np
from pathlib import Path

# Get the absolute path to the model directory
CURRENT_DIR = Path(__file__).parent
MODEL_DIR = CURRENT_DIR.parent / 'model'

def load_model_and_vectorizer():
    """Load the trained model and vectorizer"""
    try:
        model_path = MODEL_DIR / 'model.pkl'
        vectorizer_path = MODEL_DIR / 'vectorizer.pkl'
        
        if not model_path.exists():
            raise FileNotFoundError(f"Model file not found at {model_path}")
        if not vectorizer_path.exists():
            raise FileNotFoundError(f"Vectorizer file not found at {vectorizer_path}")
        
        model = joblib.load(model_path)
        vectorizer = joblib.load(vectorizer_path)
        
        return model, vectorizer
    except Exception as e:
        print(f"Error loading model files: {str(e)}", file=sys.stderr)
        sys.exit(1)

def normalize_category(category):
    """Normalize category names to match group categories"""
    category_mapping = {
        'js': 'JavaScript',
        'javascript': 'JavaScript',
        'web': 'Web Development',
        'web_dev': 'Web Development',
        'python': 'Python',
        # Add more mappings as needed
    }
    return category_mapping.get(category.lower(), category)

def predict_groups(user_skills):
    """Predict group recommendations based on user skills"""
    try:
        # Load model and vectorizer
        model, vectorizer = load_model_and_vectorizer()
        
        # Join skills into a single string
        skills_text = ' '.join(user_skills)
        
        # Transform user skills using the vectorizer
        skills_vector = vectorizer.transform([skills_text])
        
        # Get predictions and probabilities
        predictions = model.predict_proba(skills_vector)
        
        # Get class labels (categories)
        categories = model.classes_
        
        # Get top N recommendations
        N = 5
        top_n_indices = np.argsort(predictions[0])[-N:][::-1]
        
        # Create recommendations with normalized categories
        recommended_groups = [
            {
                'category': normalize_category(categories[idx]),
                'probability': float(predictions[0][idx])
            }
            for idx in top_n_indices
        ]
        
        return recommended_groups
        
    except Exception as e:
        print(f"Error during prediction: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    try:
        # Read input from Node.js
        if len(sys.argv) < 2:
            raise ValueError("No skills provided")
            
        user_skills = json.loads(sys.argv[1])
        
        if not isinstance(user_skills, list):
            raise ValueError("Skills must be provided as a list")
            
        # Get predictions
        recommendations = predict_groups(user_skills)
        
        # Return predictions to Node.js
        print(json.dumps(recommendations))
        
    except Exception as e:
        print(f"Error processing input: {str(e)}", file=sys.stderr)
        sys.exit(1) 