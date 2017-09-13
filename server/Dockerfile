FROM node:6.11-alpine
LABEL maintainer="chris.greenhalgh@nottingham.ac.uk"

RUN npm install -g bower
RUN apk add --no-cache git

WORKDIR /root/musiccodes/server/
ADD bower.json .bowerrc ./
RUN bower install --allow-root

ADD package.json ./
RUN npm install --production

ADD server.js ./
ADD lib/ lib/
ADD public/ public/
# pegjs? dev dep...
#RUN npm run prepublish

ADD experiences/ experiences/
# VOLUME /root/musiccodes/server/experiences

RUN bower install --allow-root

# 2-stage build requires docker 17.05 or above!
FROM node:6.11-alpine
LABEL maintainer="chris.greenhalgh@nottingham.ac.uk"

WORKDIR /root/

COPY --from=0 /root/musiccodes/server/ .

VOLUME /root/logs

EXPOSE 3000

CMD ["node","server.js"]
