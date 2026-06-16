FROM node:22-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    cmake \
    ninja-build \
    g++ \
    git \
    libpng-dev \
    libjpeg62-turbo-dev \
    libhwy-dev \
    liblcms2-dev \
    && rm -rf /var/lib/apt/lists/*

# Build ssimulacra2 from source
RUN git clone https://github.com/cloudinary/ssimulacra2 /tmp/ssimulacra2 && \
    cd /tmp/ssimulacra2 && \
    bash build_ssimulacra && \
    cp build/ssimulacra2 /usr/local/bin/ssimulacra2 && \
    rm -rf /tmp/ssimulacra2

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN npm run build

ENV NODE_ENV=production
ENV PORT=3001
ENV SSIMULACRA2_BIN=/usr/local/bin/ssimulacra2
ENV FFMPEG_BIN=/usr/bin/ffmpeg
ENV FFPROBE_BIN=/usr/bin/ffprobe

EXPOSE 3001

CMD ["node", "server/index.js"]
