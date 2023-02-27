import { User } from '@prisma/client';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto } from './dto';
import axios from 'axios';
import crypto from 'crypto';


async function getCoalition(login: string, token: string, callback) {
  const headers = {
		'Authorization': 'Bearer ' + token,
	}
  await axios
    .get("https://api.intra.42.fr//v2/users/" + login +  "/coalitions", {
      headers: headers
  }).then(function(response) {
    callback(response.data[0].name);
  })
}

async function parseData(data: object, coalition: string)  {
  console.log(data['login']);
  console.log(data['email']);
  console.log(data['usual_full_name']);
  console.log(data['phone']);
}



@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  
  async intraGet(barcode: string, callbacks) {
      const response = await axios
        .post('https://api.intra.42.fr/oauth/token', {
          grant_type: 'authorization_code',
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
          code: barcode,
          redirect_uri: 'http://142.93.164.123:3000/auth/intra42',
        })
        .then(function (response) {
          axios
            .get('https://api.intra.42.fr/v2/me', {
              headers: { Authorization: `Bearer ${response.data.access_token}` },
            })
            .then(function (data) {
              getCoalition(data.data['login'], response.data.access_token, callback => {
                parseData(data.data, callback);
                callbacks(data.data);
              });
            });
        })
        .catch(function (error) {
          console.log(error.data);
        });
    }
}
