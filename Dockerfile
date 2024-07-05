# Use an official Node.js runtime as a parent image
FROM node:14

# Set the working directory inside the Docker container
WORKDIR /app

# Copy package.json and package-lock.json from the local machine to the working directory in the Docker container
COPY package*.json ./

# Install app dependencies
RUN npm install

# Change the apt sources list and update package lists, then install ffmpeg
RUN echo "deb http://deb.debian.org/debian buster main" > /etc/apt/sources.list \
    && echo "deb http://deb.debian.org/debian buster-updates main" >> /etc/apt/sources.list \
    && echo "deb http://security.debian.org/debian-security buster/updates main" >> /etc/apt/sources.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
    ffmpeg \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Verify ffmpeg installation by printing its path
RUN which ffmpeg

# Copy the rest of the application code from the local machine to the working directory in the Docker container
COPY . .

# Inform Docker that the container listens on port 3000 at runtime
EXPOSE 3000

# Define the command to run the application inside the Docker container
CMD ["node", "index.js"]
