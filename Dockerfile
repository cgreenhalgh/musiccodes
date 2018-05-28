FROM node:8.11.2-stretch

RUN npm install -g node-gyp node-pre-gyp

RUN apt-get update && apt-get install -y libsndfile1-dev

# vamp plugin SDK
RUN curl https://code.soundsoftware.ac.uk/attachments/download/1520/vamp-plugin-sdk-2.6.tar.gz | tar zxf -
RUN cd vamp-plugin-sdk-2.6 && \
      aclocal && \
      autoconf && \
      ./configure && \
      make && \
      make install && \
      make clean
      
# silvet plugin
RUN curl https://code.soundsoftware.ac.uk/attachments/download/1591/silvet-linux64-v1.1.tar.bz2 | tar jxf - 
RUN cd silvet-linux64-v1.1 && \
      cp silvet.* /usr/local/lib/vamp && \
      ldconfig -v

#RUN curl https://code.soundsoftware.ac.uk/attachments/download/1594/silvet-v1.1.tar.bz2 | tar jxf - 
#RUN cd silvet-v1.1 && \
#      aclocal && \
#      autoconf && \
#      ./configure && \
#      make && \
#      make install && \
#      make clean
      
# vamp-live
RUN git clone https://github.com/cgreenhalgh/vamp-live.git && \
      cd vamp-live && \
      aclocal && \
      autoconf && \
      ./configure && \
      make && \
      make install && \
      make clean
      
RUN mkdir /srv/musiccodes 
COPY server /srv/musiccodes
WORKDIR /srv/musiccodes

RUN npm install 
#--no-bin-links
RUN npm install -g bower && \
    bower --allow-root install

# experience files
VOLUME /srv/musiccodes/experiences/
# log files
VOLUME /srv/musiccodes/logs/
# extra content files
VOLUME /src/musiccodes/public/content/

# mpm server url
ENV DEFAULT_MPM_SERVER 'http://localhost:3003'

EXPOSE 3000

CMD ["node","server.js"]