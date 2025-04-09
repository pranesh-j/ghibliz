import re

def generate_upi_link(upi_id, amount, reference_code):
    """Generate UPI link with reference code in transaction note"""
    return f"upi://pay?pa={upi_id}&pn=Ghiblit&am={amount}&cu=INR&tn={reference_code}"

def is_valid_transaction_id(transaction_id):
    """Basic validation for transaction ID formats"""
    if re.match(r'^P\d{10,16}$', transaction_id):
        return True
    if re.match(r'^[A-Z0-9]{12,18}$', transaction_id):
        return True
    if re.match(r'^[A-Za-z0-9]{10,22}$', transaction_id):
        return True
    return False