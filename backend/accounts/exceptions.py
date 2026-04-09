from rest_framework.views import exception_handler
from rest_framework.response import Response

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    
    if response is not None:
        message = 'An error occurred'
        
        if isinstance(response.data, dict):
            if 'detail' in response.data:
                message = response.data['detail']
            elif 'error' in response.data:
                message = response.data['error']
                if isinstance(message, list) and len(message) > 0:
                    message = message[0]
            elif 'non_field_errors' in response.data:
                message = response.data['non_field_errors']
                if isinstance(message, list) and len(message) > 0:
                    message = message[0]
            else:
                # Grabs the first error key available
                first_key = next(iter(response.data.keys()), None)
                if first_key:
                    val = response.data[first_key]
                    message = val[0] if isinstance(val, list) and len(val) > 0 else val
        elif isinstance(response.data, list) and len(response.data) > 0:
            message = response.data[0]

        custom_response_data = {
            'status_code': response.status_code,
            'message': str(message),
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