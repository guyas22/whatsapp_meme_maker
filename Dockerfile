# Use the AWS Lambda Python 3.8 runtime
FROM public.ecr.aws/lambda/python:3.8

# Copy the application code into the container
COPY . /var/task/

# Install Python dependencies
RUN pip install --no-cache-dir -r /var/task/requirements.txt

# Specify the Lambda handler
CMD ["app.handler"]
