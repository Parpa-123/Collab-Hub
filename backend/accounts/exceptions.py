from rest_framework.views import exception_handler
from rest_framework.response import Response

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    
    if response is not None:
        custom_response_data = {
            'status_code': response.status_code,
            'message': response.data.get('detail', 'An error occurred'),
            'error' : True
        }
        
        if response.status_code == 401:
            custom_response_data['message'] = 'Unauthorized'
            custom_response_data['action'] = 'redirect_to_login'
        elif response.status_code == 403:
            custom_response_data['message'] = 'Forbidden'
            custom_response_data['action'] = 'show_error'
        
        response.data = custom_response_data
    
    return response