import os
from pydantic import BaseModel

class PISettings(BaseModel):
    base_url: str = "https://pi-api/piwebapi"
    username: str = "holdings"
    password: str = "holdings"
    verify_ssl: bool = False
    timeout: int = 10
    
    # Target Asset Database & Element WebIds
    asset_server_name: str = "sbpa-pi2"
    asset_db_name: str = "Holdings"
    element_name: str = "Holdings"
    element_web_id: str = "F1Em-67TAo1Hq0Sb--W-lXx3_QRyq5-ydT8RGK6Szqf25sxQU0JQQS1QSTJcSE9MRElOR1NcSE9MRElOR1M"

settings = PISettings()
