from storages.backends.s3boto3 import S3Boto3Storage

class GeneratedImagesStorage(S3Boto3Storage):
    bucket_name = 'ghiblits'
    
class PaymentScreenshotsStorage(S3Boto3Storage):
    bucket_name = 'payments'
