import requests
from typing import List, Dict, Optional
import json

class ImgflipAPI:
    """Handler for Imgflip API interactions"""
    
    def __init__(self):
        self.base_url = "https://api.imgflip.com"
        self._meme_templates = None
    
    def get_meme_templates(self, force_refresh: bool = False) -> List[Dict]:
        """
        Get a list of available meme templates from Imgflip API.
        Caches the results to avoid unnecessary API calls.
        """
        if self._meme_templates is None or force_refresh:
            response = requests.get(f"{self.base_url}/get_memes")
            response.raise_for_status()
            data = response.json()
            
            if data["success"]:
                self._meme_templates = data["data"]["memes"]
            else:
                raise Exception(f"Failed to get meme templates: {data.get('error_message')}")
        
        return self._meme_templates
    
    def download_template(self, template_url: str, output_path: str) -> str:
        """
        Download a meme template image and save it to the specified path.
        Returns the path to the downloaded image.
        """
        response = requests.get(template_url, stream=True)
        response.raise_for_status()
        
        with open(output_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        return output_path
    


if __name__ == "__main__":
    imgflip_api = ImgflipAPI()
    print(imgflip_api.get_meme_templates())
    ## gets the first meme template
    print(imgflip_api.get_meme_templates()[0])
    ## gets the first meme template url
    print(imgflip_api.get_meme_templates()[0]["url"])
    ## downloads the first meme template
    imgflip_api.download_template(imgflip_api.get_meme_templates()[20]["url"], "utils/temp_template.jpg")
